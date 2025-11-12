# Petshop Management System - AI Agent Instructions

## Project Architecture
Next.js 16 + Convex full-stack petshop POS with real-time sync, multi-branch inventory, and transaction management. Stack: React 19, TypeScript, shadcn/ui (New York), Tailwind CSS v4, Convex Auth.

## Development Workflow

### Starting Development
```powershell
npm run dev  # Parallel: Next.js (3000) + Convex dev server
```
**Critical**: `predev` script runs `setup.mjs` (Convex Auth config) → auto-opens dashboard. Convex functions hot-reload on save to `convex/`.

### Project-Specific Gotchas
1. **Soft deletes everywhere**: Never use `ctx.db.delete()` - use `ctx.db.patch(id, { deletedAt: Date.now() })`
2. **Index-first queries**: NO `.filter()` in Convex queries - define indexes in `schema.ts`, use `.withIndex()`
3. **Stock consistency**: Sales/purchases must call helper mutations in `productStock.ts` (`reduceStockForSaleHelper`, `addStockForPurchaseHelper`) to maintain `averageCost` and create `stockMovements`
4. **Multi-step transactions**: Sales module pattern (see `convex/sales.ts`): Create draft → Add items → Submit with payments → Auto-reduce stock
5. **Auth fields pending**: `createdBy`/`updatedBy` set to `undefined` until RBAC enforcement

## Convex Backend Patterns (MANDATORY)

### Function Syntax
Always use new format with explicit validators:
```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { categoryId: v.optional(v.id("productCategories")) },
  returns: v.array(v.object({ /* shape */ })), // REQUIRED
  handler: async (ctx, args) => {
    const items = await ctx.db.query("products")
      .withIndex("by_category", q => q.eq("categoryId", args.categoryId))
      .collect();
    return items.filter(p => p.isActive && !p.deletedAt);
  },
});
```
**Critical**: `returns: v.null()` if no return value. Never omit validators.

### Query Performance Rules
```typescript
// ❌ WRONG: Runtime filter (slow)
const products = await ctx.db.query("products").collect();
return products.filter(p => p.categoryId === categoryId);

// ✅ CORRECT: Index-based query
const products = await ctx.db.query("products")
  .withIndex("by_category", q => q.eq("categoryId", categoryId))
  .collect();
```
**Index naming**: `by_field1_and_field2` matching `["field1", "field2"]` in schema

### Transaction Helper Pattern
See `convex/productStock.ts` for reusable helpers:
```typescript
// Export helper for reuse across mutations
export async function reduceStockForSaleHelper(ctx, args) {
  // Atomically: check stock → reduce → log movement → calculate COGS
  // Throws if insufficient stock
}
```
Used in `sales.submitSale`, `transfers.complete`, etc.

## Frontend Patterns

### Data Flow (Convex Real-time)
```tsx
"use client"; // Required for Convex hooks
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function SalesPage() {
  const sales = useQuery(api.sales.list, { status: "Completed" });
  const createSale = useMutation(api.sales.create);
  
  // undefined = loading, null = no data, array = data
  if (sales === undefined) return <Spinner />;
  
  const handleSubmit = async () => {
    await createSale({ branchId, customerId, saleDate: Date.now() });
    toast.success("Created"); // Always use sonner for feedback
  };
}
```

### UI Conventions
- **Components**: shadcn/ui from `@/components/ui/*` (auto-imported via `components.json`)
- **Icons**: Lucide React (`import { Receipt, Package } from "lucide-react"`)
- **Styling**: Tailwind utilities + `cn()` from `@/lib/utils` for conditional classes
- **Colors**: `slate` neutrals, `blue` primary, `red` destructive
- **Forms**: Dialog-based create/edit (see `app/dashboard/sales/page.tsx`)
- **Tables**: shadcn Table + custom `formatCurrency()`, `formatDate()` from `lib/utils`

### Navigation Structure
`app/dashboard/layout.tsx` defines sidebar with nested "Master Data" section. Pattern:
```tsx
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Penjualan", href: "/dashboard/sales", icon: Receipt },
  { 
    name: "Master Data", 
    icon: Settings, 
    children: [{ name: "Kategori", href: "/dashboard/categories", icon: Package }] 
  },
];
```

## Domain-Specific Business Logic

### Stock Management Flow
1. **Purchase Order**: Draft → Submit → Receive (calls `addStockForPurchaseHelper`)
2. **Sale**: Draft → Add items → Submit with payments → Auto-reduces stock via `reduceStockForSaleHelper`
3. **Stock Movements**: Audit log in `stockMovements` table (types: `PURCHASE_IN`, `SALE_OUT`, `ADJUSTMENT_IN/OUT`, `TRANSFER_IN/OUT`)

### Multi-Branch Inventory
- `productStock` table: Composite key `(branchId, productId, variantId)`
- `averageCost` recalculated on every purchase using weighted average
- Low stock alerts: Query where `quantity < product.minStock`

### Sales Transaction Calculation
See `convex/sales.ts` helpers:
```typescript
// Item subtotal: qty × price - discount (per item)
// Subtotal: Sum of item subtotals
// Transaction discount: Applied to subtotal (percent or nominal)
// Tax: Applied after discount (e.g., PPN 11%)
// Total = subtotal - txnDiscount + tax
// Outstanding = total - paidAmount (for credit sales)
```

### Customer Defaults
`convex/customers.ts` provides `getOrCreateDefault` for walk-in customers. Seed with:
```typescript
await ctx.mutation(api.customers.createDefaultCustomer, {});
```

## Common Implementation Tasks

### Adding New CRUD Resource
1. **Schema**: Add table to `convex/schema.ts` with indexes
   ```typescript
   myTable: defineTable({ name: v.string(), isActive: v.boolean(), deletedAt: v.optional(v.number()) })
     .index("by_name", ["name"])
   ```
2. **Backend**: Create `convex/myResource.ts` with exports: `create`, `list`, `get`, `update`, `remove`
3. **Frontend**: Create `app/dashboard/my-resource/page.tsx` (copy pattern from `sales/page.tsx`)
4. **Navigation**: Add to `app/dashboard/layout.tsx` navigation array
5. **Naming**: Plural files/tables, Indonesian UI labels, English code

### Multi-Step Transaction Pattern (Sales/PO)
1. Create draft with header fields
2. Add items (recalculates totals on each add/update)
3. Submit with validations:
   - Check stock availability
   - Call helper mutations (stock + movement logging)
   - Update status to "Completed"
   - Create related records (payments, receipts)

### TypeScript Type Safety
```typescript
import { Id, Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

// Type-safe IDs
const productId: Id<"products"> = doc._id;

// Full document types
const product: Doc<"products"> = await ctx.db.get(productId);

// Function references (never pass functions directly)
await ctx.runMutation(api.products.update, { id, name });
```

## Authentication & Authorization

### Current State
- **Auth**: @convex-dev/auth password-based (configured in `convex/auth.config.ts`)
- **Middleware**: `middleware.ts` protects all routes except `/signin`
- **RBAC**: Defined in `convex/roles.ts` but NOT enforced (see TODOs)
- **User Context**: Not yet integrated - `createdBy`/`updatedBy` fields set to `undefined`

### Usage
```tsx
// In components
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";

const { signOut } = useAuthActions();
const { isAuthenticated, isLoading } = useConvexAuth();
```

## Key Files Reference
- `convex/schema.ts` - Single source of truth for database
- `convex/sales.ts` - Multi-step transaction pattern reference
- `convex/productStock.ts` - Helper mutations for atomic stock operations
- `app/dashboard/sales/page.tsx` - Complex form with dialog, items, payments
- `.cursor/rules/convex_rules.mdc` - Comprehensive Convex development guidelines
- `SALES_MODULE_README.md` - Sales implementation walkthrough

## Critical Mistakes to Avoid
1. Using `.filter()` in queries instead of indexes
2. Forgetting `returns` validator (runtime error)
3. Direct stock manipulation without calling helpers (breaks averageCost)
4. Passing function directly instead of `api.module.function`
5. Using `v.union(v.null(), ...)` instead of `v.optional()`
6. Defining system fields (`_id`, `_creationTime`) in schema
7. Not filtering `deletedAt` in list queries
8. Indonesian/English mixing in code (use English for code, Indonesian for UI)
