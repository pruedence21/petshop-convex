# Copilot Instructions - Pet Shop Management System

## Project Overview

This is a comprehensive pet shop management system built with **Next.js 16**, **Convex** (real-time backend), **TypeScript**, and **Tailwind CSS 4**. The system integrates retail POS, veterinary clinic, pet hotel/boarding, and professional double-entry accounting in one platform.

**Tech Stack:**
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- Backend: Convex (real-time database + serverless functions)
- Auth: Convex Auth (configured in `convex/auth.config.ts`, middleware in `middleware.ts`)
- UI Components: shadcn/ui with Radix UI primitives

## Architecture & Critical Patterns

### Backend Architecture (Convex)

**All business logic lives in `convex/` directory** as serverless functions:
- `query` - Read-only database queries (auto-cached, reactive)
- `mutation` - Database writes with transactions
- `internalQuery/internalMutation` - Private functions (not exposed to clients)
- `action` - External API calls, use Node.js runtime with `"use node";`

**Key Pattern:** Convex uses **file-based routing** and **function references**:
```typescript
// Define in convex/sales.ts
export const list = query({ ... });

// Call from frontend
import { api } from "@/convex/_generated/api";
const sales = useQuery(api.sales.list, { ... });

// Call internally
await ctx.runQuery(internal.sales.getSomeData, { ... });
```

**ALWAYS follow Convex conventions** from `.cursor/rules/convex_rules.mdc`:
- Use new function syntax with `args`, `returns`, and `handler`
- Include validators for ALL arguments and return types
- Use `v.null()` for functions that don't return values
- Define indexes in schema for ALL query filters (NO raw `filter()` without indexes)
- Use `withIndex()` for queries, never unindexed `filter()`

### Database Schema (`convex/schema.ts`)

50+ tables organized by domain:
- **Master Data**: `customers`, `customerPets`, `products`, `productVariants`, `branches`, `suppliers`, `units`
- **Transactions**: `sales`, `saleItems`, `salePayments`, `purchaseOrders`, `clinicAppointments`, `hotelBookings`
- **Inventory**: `productStock`, `stockMovements` (audit log of all stock changes)
- **Accounting**: `accounts` (Chart of Accounts), `journalEntries`, `journalEntryLines`, `bankAccounts`, `expenses`
- **AR/AP**: Tracked through `outstandingAmount` fields in sales/appointments

**Critical Pattern - Soft Deletes**: Nearly all tables have `deletedAt: v.optional(v.number())`. Always filter with `!record.deletedAt` in queries.

**Critical Pattern - Audit Fields**: Most tables track `createdBy`, `updatedBy` (user IDs) and `_creationTime` (auto-added by Convex).

### Accounting Module - THE MOST IMPORTANT PATTERN

**Double-Entry Bookkeeping**: Every business transaction (sale, purchase, expense, payment) automatically generates journal entries via `accountingHelpers.ts`.

**How it works:**
1. Business transaction mutation completes (e.g., `sales.completeSale`)
2. Before returning, calls `createSaleJournalEntry()` from `accountingHelpers.ts`
3. Helper function:
   - Generates journal number (JE-YYYYMMDD-001)
   - Creates `journalEntries` record (header)
   - Creates multiple `journalEntryLines` (debits & credits)
   - **MUST balance**: `totalDebit === totalCredit`
   - Links back to source transaction via `sourceType` + `sourceId`

**Example Journal Entry for Sale:**
```typescript
// Sale completed: IDR 110,000 (10,000 discount, paid cash, COGS: 60,000)
Debit:  Cash (1-111)                    100,000  // paidAmount
Debit:  AR (1-141)                        0      // outstandingAmount
Debit:  COGS (5-111)                     60,000  // sum of item.cogs
Debit:  Discount Exp (5-511)             10,000  // transaction discount
Credit: Sales Revenue (4-111)           110,000  // totalAmount
Credit: Inventory (1-131)                60,000  // sum of item.cogs
```

**When modifying transactions**: ALWAYS ensure journal entries are created/updated/voided accordingly.

### Frontend Patterns (Next.js App Router)

**Structure**: `/app/dashboard/[module]/page.tsx` for main routes
- Each page is a Client Component (`"use client"`)
- Uses `useQuery()` and `useMutation()` from `convex/react`
- shadcn/ui components imported from `@/components/ui/`

**Real-time Data Pattern:**
```typescript
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SalesPage() {
  // Auto-updates when data changes (reactive!)
  const sales = useQuery(api.sales.list, { status: "Completed" });
  const completeMutation = useMutation(api.sales.completeSale);
  
  if (sales === undefined) return <LoadingSpinner />; // undefined = loading
  // ... render
}
```

**Loading States**: Convex queries return `undefined` during initial load, then data. ALWAYS handle this:
```typescript
if (data === undefined) return <LoadingState />;
```

### MCP Integration (Model Context Protocol)

**MCP servers configured in `.kilocode/mcp.json`**:
- `convex-mcp`: Query Convex deployment, read data, view tables, run functions
- `next-devtools`: Next.js 16 runtime inspection, error detection, route analysis
- `shadcn`: Component discovery, add UI components

**Using MCPs**:
1. **Convex MCP** - Use to inspect database, understand schema, query data without writing code
2. **Next DevTools** - ALWAYS run `init` first, then use `nextjs_runtime` to inspect running dev server
3. **shadcn MCP** - Search components, view examples, get add commands

## Development Workflows

### Running the App

**Start dev server:**
```powershell
npm run dev
```

This runs **both** Next.js frontend (port 3000) and Convex backend concurrently via `npm-run-all`:
- Frontend: `next dev` (http://localhost:3000)
- Backend: `convex dev` (watches `convex/` folder, hot-reloads functions)

**Important**: Convex requires authentication setup on first run. The `predev` script handles this automatically.

### Database Seeding

**Initial setup** is handled by `setup.mjs` (runs via `predev` script):
- Creates default Chart of Accounts (80+ accounts)
- Seeds categories, brands, units, branches
- Creates "Umum" (General) default customer

**Manual seeding** via Convex dashboard or functions (no separate migration files).

### Making Schema Changes

1. Edit `convex/schema.ts`
2. Convex auto-detects changes and applies them
3. **Add indexes for every query filter** - No unindexed queries!
4. For breaking changes, you may need to backfill data via mutations

### Adding New Business Transactions

**Pattern for transaction modules** (sales, purchases, clinic, hotel):

1. **Create transaction header** (Draft status)
2. **Add line items** (products/services)
3. **Calculate totals** (subtotal, discount, tax, total)
4. **Complete transaction** (finalize, reduce stock, create journal entry)
5. **Handle payments** (track paidAmount, outstandingAmount)

**Stock Movement**: ALWAYS log to `stockMovements` table when inventory changes:
```typescript
await ctx.db.insert("stockMovements", {
  branchId, productId, variantId,
  movementType: "SALE_OUT", // or PURCHASE_IN, ADJUSTMENT_IN, etc.
  quantity: -saleQty, // negative for OUT, positive for IN
  referenceType: "Sale",
  referenceId: saleId,
  movementDate: Date.now(),
});
```

### Accounting Integration Checklist

When creating new transaction types:
1. ✅ Add helper function to `convex/accountingHelpers.ts`
2. ✅ Define account codes for debits/credits
3. ✅ Ensure journal entry balances (debit = credit)
4. ✅ Link journal entry back to transaction (`sourceType`, `sourceId`)
5. ✅ Call helper from transaction completion mutation
6. ✅ Test with different scenarios (cash, credit, partial payments)

## Common Tasks & Examples

### Adding a New UI Component

**Use shadcn MCP to discover components:**
```typescript
// Search for component examples
mcp_shadcn: search_items_in_registries({ query: "dialog", registries: ["@shadcn"] })

// Get add command
mcp_shadcn: get_add_command_for_items({ items: ["@shadcn/dialog"] })

// Then run: npx shadcn@latest add dialog
```

### Querying Convex Data

**Always use indexes** (defined in schema):
```typescript
// ✅ GOOD - Uses index
const sales = await ctx.db
  .query("sales")
  .withIndex("by_branch", (q) => q.eq("branchId", branchId))
  .filter((q) => q.eq(q.field("status"), "Completed"))
  .collect();

// ❌ BAD - No index (will fail in production)
const sales = await ctx.db.query("sales")
  .filter((q) => q.eq(q.field("branchId"), branchId))
  .collect();
```

### Generating Document Numbers

**Pattern**: All transactions use consistent format: `PREFIX-YYYYMMDD-NNN`
- Sales: `INV-20250112-001`
- Purchase Orders: `PO-20250112-001`
- Journal Entries: `JE-20250112-001`

**Implementation** (see any transaction file):
```typescript
async function generateDocNumber(ctx, prefix: string) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fullPrefix = `${prefix}-${dateStr}-`;
  
  // Query existing docs with same prefix
  const existing = await ctx.db.query("tableName")
    .withIndex("by_doc_number")
    .collect();
  
  const filtered = existing.filter(doc => doc.docNumber.startsWith(fullPrefix));
  if (filtered.length === 0) return `${fullPrefix}001`;
  
  const maxNum = Math.max(...filtered.map(doc => {
    const num = doc.docNumber.split("-")[2];
    return parseInt(num, 10);
  }));
  
  return `${fullPrefix}${String(maxNum + 1).padStart(3, "0")}`;
}
```

### Working with Indonesian Currency

**Always format as IDR** with `Intl.NumberFormat`:
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // No decimal places for IDR
  }).format(amount);
};
```

## Testing Strategy

**No formal test suite yet**. Validation approach:
1. Manual testing via frontend UI
2. Convex dashboard for querying data
3. Use MCP tools to inspect database state
4. Check journal entries balance after transactions

## Project-Specific Conventions

### Naming Conventions
- **Tables**: camelCase (`productCategories`, `saleItems`)
- **Functions**: camelCase (`create`, `list`, `completeSale`)
- **Files**: camelCase matching table name (`productCategories.ts`)
- **Components**: PascalCase (`SalesPage`, `ProductForm`)

### File Organization
- `convex/`: All backend logic (queries, mutations, schema)
- `app/dashboard/`: All authenticated UI pages
- `components/ui/`: Reusable shadcn/ui components
- `doc/`: Comprehensive documentation (read for deep dives)

### Code Style
- TypeScript strict mode enabled
- Prefer explicit types over inference for function args/returns
- Use Convex validators (`v.*`) for runtime type checking
- Format with Prettier (configured in project)

## Important Caveats & Gotchas

1. **Convex Mutations are Atomic**: If mutation throws, entire transaction rolls back (good for data integrity)
2. **No JOIN queries**: Convex is NoSQL-like. Load related data with `ctx.db.get(id)` or separate queries
3. **Indexes Required**: Production Convex REQUIRES indexes for filters. Always define in schema
4. **Soft Deletes**: Filter out `deletedAt` records manually in queries
5. **File Storage**: Use Convex storage API for large files (images, PDFs), not database
6. **Authentication**: Protected routes handled by middleware.ts (redirects unauthenticated users to /signin)

## Key Files to Reference

- `convex/schema.ts` - Complete database schema (50+ tables)
- `.cursor/rules/convex_rules.mdc` - Comprehensive Convex patterns
- `convex/accountingHelpers.ts` - Journal entry auto-generation
- `doc/10-accounting-module.md` - Deep dive on accounting logic
- `doc/01-project-overview.md` - High-level system design

## When Stuck

1. **Schema Questions**: Read `convex/schema.ts` - it's heavily commented
2. **Convex Patterns**: Check `.cursor/rules/convex_rules.mdc` for examples
3. **Business Logic**: Review `doc/` folder for module-specific documentation
4. **UI Components**: Use shadcn MCP to find examples
5. **Runtime Inspection**: Use next-devtools MCP to debug running app
6. **Database Queries**: Use convex-mcp to inspect tables and data

## MCP Workflow Example

**Scenario**: User reports AR aging report showing incorrect data.

**Investigation Steps:**
1. Use `convex-mcp` to query `sales` table, filter by `outstandingAmount > 0`
2. Use `next-devtools` `nextjs_runtime` to check if dev server has errors
3. Read `convex/accountsReceivable.ts` to understand calculation logic
4. Check `doc/10-accounting-module.md` for expected behavior
5. Compare with `app/dashboard/accounting/ar-aging/page.tsx` for UI logic

**Fix Approach:**
1. Write fix in `convex/accountsReceivable.ts` (backend) if calculation wrong
2. Write fix in `app/dashboard/accounting/ar-aging/page.tsx` if display wrong
3. Use convex-mcp to verify data after fix
4. Test in browser UI

---

**Remember**: This is a real-time, reactive system. When backend data changes, frontend auto-updates. Leverage Convex's reactivity for great UX!
