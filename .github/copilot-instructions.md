# Petshop Management System - AI Agent Instructions

## Project Architecture
Next.js 16 + Convex full-stack petshop POS with real-time sync, multi-branch inventory, transaction management, and veterinary clinic services. Stack: React 19, TypeScript, shadcn/ui (New York), Tailwind CSS v4, Convex Auth.

**Key modules:** Retail sales, Purchase orders, Inventory, Clinic appointments (with prescription tracking), Medical records, Multi-payment support (Cash/QRIS/Credit/Bank/Debit)

## Development Workflow

### Starting Development
```powershell
npm run dev  # Parallel: Next.js (3000) + Convex dev server
```
**Critical**: `predev` script runs `setup.mjs` (Convex Auth config) → auto-opens dashboard. Convex functions hot-reload on save to `convex/`.

### Project-Specific Gotchas
1. **Soft deletes everywhere**: Never use `ctx.db.delete()` - use `ctx.db.patch(id, { deletedAt: Date.now() })`
2. **Index-first queries**: NO `.filter()` in Convex queries - define indexes in `schema.ts`, use `.withIndex()`
3. **Stock consistency**: Sales/purchases/clinic must call helpers in `productStock.ts` (`reduceStockForSaleHelper`, `addStockForPurchaseHelper`) to maintain `averageCost` + create `stockMovements`
4. **Multi-step transactions**: Pattern (sales/PO/clinic): Create draft → Add items → Submit with payments → Auto-reduce stock
5. **Auth fields pending**: `createdBy`/`updatedBy` set to `undefined` until RBAC enforcement
6. **Number generators**: Use dedicated functions like `generateSaleNumber()`, `generateAppointmentNumber()` - pattern: `PREFIX-YYYYMMDD-001`
7. **Clinic prescription flow**: `isPrescription: true` on appointment services → stock NOT reduced until `pickupPrescription()` called

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
3. **Clinic Appointment**: Draft → Add services → Submit with payments → Reduces stock ONLY for non-prescription items
   - Prescription items: `isPrescription: true` → stock reduced later via `pickupPrescription()`
4. **Stock Movements**: Audit log in `stockMovements` table (types: `PURCHASE_IN`, `SALE_OUT`, `ADJUSTMENT_IN/OUT`, `TRANSFER_IN/OUT`)

### Multi-Branch Inventory
- `productStock` table: Composite key `(branchId, productId, variantId)`
- `averageCost` recalculated on every purchase using weighted average
- Low stock alerts: Query where `quantity < product.minStock`

### Transaction Calculation Pattern (Sales & Clinic)
See `convex/sales.ts` and `convex/clinicAppointments.ts` helpers:
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

### Clinic-Specific Patterns
- **Time Slots**: 08:00-17:00, 30-min intervals (09:00, 09:30, 10:00...)
- **Staff Availability**: `checkAvailability` query prevents double-booking
- **Prescription Pickup**: 
  ```typescript
  // At appointment completion: isPrescription services NOT stocked out
  // Later pickup: staff calls pickupPrescription(serviceItemId)
  // → reduces stock + marks prescriptionPickedUp = true
  ```
- **Medical Records**: Auto-created from completed appointments via `createFromAppointment()`

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
- `convex/schema.ts` - Single source of truth for database (includes clinic tables)
- `convex/sales.ts` - Multi-step transaction pattern reference
- `convex/clinicAppointments.ts` - Appointment scheduling + prescription flow
- `convex/productStock.ts` - Helper mutations for atomic stock operations
- `app/dashboard/sales/page.tsx` - Complex form with dialog, items, payments
- `app/dashboard/clinic/appointments/page.tsx` - Appointment UI implementation
- `.cursor/rules/convex_rules.mdc` - Comprehensive Convex development guidelines
- `SALES_MODULE_README.md` - Sales implementation walkthrough
- `CLINIC_MODULE_README.md` - Clinic module features and workflows

## MCP (Model Context Protocol) Integration

### Available MCP Servers
Project configured with three MCP servers (`.vscode/mcp.json`):

1. **convex-mcp**: Direct Convex backend interaction
   - Query/manipulate database without code changes
   - View deployment status, function specs, logs
   - Run queries/mutations with real-time results
   - Access: `mcp_convex-mcp_status`, `mcp_convex-mcp_data`, `mcp_convex-mcp_run`, `mcp_convex-mcp_logs`

2. **next-devtools**: Next.js runtime diagnostics
   - Initialize with `mcp_next-devtools_init` FIRST in Next.js sessions
   - Query Next.js docs: `mcp_next-devtools_nextjs_docs`
   - Runtime diagnostics: `mcp_next-devtools_nextjs_runtime`
   - Browser automation: `mcp_next-devtools_browser_eval`
   - Upgrade helper: `mcp_next-devtools_upgrade_nextjs_16`

3. **shadcn**: Component registry management
   - List/search components: `mcp_shadcn_list_items_in_registries`, `mcp_shadcn_search_items_in_registries`
   - View component details: `mcp_shadcn_view_items_in_registries`
   - Get install commands: `mcp_shadcn_get_add_command_for_items`

### When to Use MCP Tools

**Convex MCP** - Use when:
- Debugging backend issues (check logs, query data directly)
- Testing mutations without writing test code
- Viewing deployment status or function metadata
- Running one-off queries for data analysis
- Checking environment variables

**Next.js DevTools MCP** - Use when:
- Starting any Next.js development session (call `init` first)
- Need official Next.js documentation
- Debugging runtime errors or build issues
- Testing page interactions (browser automation)
- Upgrading Next.js versions

**shadcn MCP** - Use when:
- Adding new UI components
- Searching for component examples
- Checking component dependencies
- Getting usage patterns for components

### MCP Usage Patterns

```typescript
// Example: Query Convex data directly
mcp_convex-mcp_status({ projectDir: "d:\\Koding\\petshop-convex" })
// → Get deployment selector for prod/dev

mcp_convex-mcp_data({
  deploymentSelector: "{\"kind\":\"ownDev\"}",
  tableName: "products",
  order: "desc"
})
// → Read products table

mcp_convex-mcp_run({
  deploymentSelector: "{\"kind\":\"ownDev\"}",
  functionName: "sales.list",
  args: "{\"status\":\"Completed\"}"
})
// → Execute sales.list query

// Example: Next.js documentation
mcp_next-devtools_init({ project_path: "d:\\Koding\\petshop-convex" })
// → Initialize (call first in session)

mcp_next-devtools_nextjs_docs({
  action: "search",
  query: "app router data fetching"
})
// → Search Next.js docs

// Example: shadcn components
mcp_shadcn_search_items_in_registries({
  registries: ["@shadcn"],
  query: "data table"
})
// → Find data table component
```

### MCP Best Practices
1. **Convex debugging**: Use MCP tools before diving into code - faster data inspection
2. **Next.js sessions**: Always call `mcp_next-devtools_init` first for accurate docs
3. **Component discovery**: Use shadcn MCP before manually adding components
4. **Avoid redundancy**: Don't write temporary debugging code if MCP can answer it
5. **Real-time testing**: Use `mcp_convex-mcp_run` to test mutations with actual data

## Critical Mistakes to Avoid
1. Using `.filter()` in queries instead of indexes
2. Forgetting `returns` validator (runtime error)
3. Direct stock manipulation without calling helpers (breaks averageCost)
4. Passing function directly instead of `api.module.function`
5. Using `v.union(v.null(), ...)` instead of `v.optional()`
6. Defining system fields (`_id`, `_creationTime`) in schema
7. Not filtering `deletedAt` in list queries
8. Indonesian/English mixing in code (use English for code, Indonesian for UI)
9. Reducing stock for prescription items at appointment completion (use pickup flow)
10. Not using MCP tools when debugging/inspecting data (faster than writing temp code)
