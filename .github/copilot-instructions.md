# Petshop Management System - AI Agent Instructions

## Project Overview
A Next.js 16 + Convex full-stack petshop management application with authentication, real-time data, and role-based permissions. Uses React 19, TypeScript, shadcn/ui components, and Tailwind CSS v4.

## Tech Stack Architecture
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Convex (real-time database, queries, mutations, actions)
- **Auth**: @convex-dev/auth with password-based authentication
- **UI**: shadcn/ui components (New York style), Lucide icons
- **State**: Convex React hooks (`useQuery`, `useMutation`, `useConvexAuth`)

## Critical Development Workflows

### Starting Development
```powershell
npm run dev  # Runs both Next.js (port 3000) and Convex dev server in parallel
```
- `predev` script initializes Convex, runs `setup.mjs`, opens dashboard
- Both frontends/backend hot-reload automatically
- Convex functions deploy on save to `convex/` directory

### Database Schema Location
- **Schema**: `convex/schema.ts` - The single source of truth for all tables
- Indexes MUST be defined in schema for query performance
- All schema changes auto-deploy via Convex dev server

## Convex Function Patterns (MANDATORY)

### Function Syntax (New Format Only)
**ALWAYS** use new function syntax with explicit validators:
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const functionName = query({
  args: { id: v.id("tableName"), name: v.string() },
  returns: v.object({ /* shape */ }) // or v.null() if no return
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Query Patterns
- **NO `.filter()`** - Define indexes in `schema.ts` and use `.withIndex()`
- **Ordering**: Default is `asc` by `_creationTime`. Use `.order("desc")` to reverse
- **Soft Deletes**: Filter `!product.deletedAt` in all list queries
- **Related Data**: Fetch related entities with `ctx.db.get(foreignKeyId)`

Example from `convex/products.ts`:
```typescript
export const list = query({
  args: { categoryId: v.optional(v.id("productCategories")) },
  handler: async (ctx, args) => {
    let products = args.categoryId
      ? await ctx.db.query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
          .collect()
      : await ctx.db.query("products").collect();
    
    return products.filter(p => p.isActive && !p.deletedAt);
  },
});
```

### File Organization
- Each resource (products, customers, suppliers, etc.) has its own file in `convex/`
- Standard exports: `create`, `list`, `get`, `update`, `remove` (soft delete)
- `convex/schema.ts` - Database schema
- `convex/auth.config.ts` - Auth configuration
- `convex/roles.ts` - RBAC with `PERMISSIONS` and `DEFAULT_ROLES` constants

## Frontend Patterns

### App Router Structure
```
app/
├── page.tsx              # Root: auto-redirects to /dashboard or /signin
├── signin/page.tsx       # Auth: Convex Auth password flow
├── dashboard/
│   ├── layout.tsx        # Sidebar navigation, logout button
│   ├── page.tsx          # Dashboard home with stats cards
│   └── [resource]/page.tsx  # CRUD pages for each resource
```

### Authentication Flow
1. `middleware.ts` enforces auth on protected routes using `convexAuthNextjsMiddleware`
2. `ConvexClientProvider.tsx` wraps app with `ConvexAuthNextjsProvider`
3. Use `useConvexAuth()` for auth state: `{ isAuthenticated, isLoading }`
4. Use `useAuthActions()` for `signIn()` and `signOut()`

### Data Fetching Pattern
```tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function Component() {
  const items = useQuery(api.products.list, { categoryId: undefined });
  const createItem = useMutation(api.products.create);
  
  // items is undefined while loading, then data or null
  if (items === undefined) return <div>Loading...</div>;
  
  return <div>{items.map(...)}</div>;
}
```

### UI Component Standards
- Import from `@/components/ui/*` (shadcn/ui components)
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Follow existing pattern: Lucide icons, Tailwind utilities, no custom CSS
- Color scheme: `slate` for neutrals, `blue` for primary actions

## Domain-Specific Context

### Data Model Hierarchy
1. **Master Data** (shared across system):
   - Product Categories → Product Subcategories → Products (with Brands, Units)
   - Animal Categories → Animal Subcategories → Customer Pets
   - Suppliers, Branches, Units (with multi-level conversions)

2. **Customer Management**:
   - Customers → Customer Pets → Pet Vaccinations + Medical Records

3. **Product Management**:
   - Products can have variants (multi-SKU)
   - Stock tracked per branch via `productStock` table
   - Price fields: `purchasePrice`, `sellingPrice`

### Soft Delete Pattern
All tables use soft deletes:
```typescript
export const remove = mutation({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });
    return args.id;
  },
});
```

### Role-Based Access Control (RBAC)
- Defined in `convex/roles.ts`: `PERMISSIONS` object, `DEFAULT_ROLES`
- Four roles: Admin (all), Manager (most), Staff (limited), Kasir (POS only)
- **NOT YET ENFORCED** - Auth integration pending (see TODOs in roles.ts)

## Common Tasks

### Adding a New Resource CRUD
1. Add table to `convex/schema.ts` with indexes
2. Create `convex/resourceName.ts` with standard exports (see `convex/products.ts`)
3. Add page to `app/dashboard/resourceName/page.tsx`
4. Add navigation link in `app/dashboard/layout.tsx`
5. Follow naming: plural for table/file names, Indonesian labels in UI

### Adding shadcn/ui Components
```powershell
npx shadcn@latest add button  # Component auto-configured per components.json
```

### TypeScript Conventions
- Use `Id<"tableName">` from `convex/_generated/dataModel` for type-safe IDs
- Use `Doc<"tableName">` for full document types
- Use `api.module.functionName` from `convex/_generated/api` for function refs
- Never pass functions directly - always use API references

## Key Files Reference
- `package.json` - Scripts, dependencies (note: npm-run-all2 for parallel commands)
- `components.json` - shadcn/ui config (New York style, RSC mode)
- `middleware.ts` - Auth protection logic
- `.cursor/rules/convex_rules.mdc` - Comprehensive Convex development guidelines

## Gotchas & Best Practices
- Convex validates args/returns at runtime - always define validators
- `returns: v.null()` required if function returns nothing/undefined
- Index names convention: `by_field1_and_field2` matching index definition
- System fields (`_id`, `_creationTime`) auto-added, don't define in schema
- Use `v.optional()` for nullable fields, NOT `v.union(v.null(), ...)`
- Indonesian UI labels, English code/variable names
