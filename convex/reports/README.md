# Convex Reports Module

## Overview

This directory contains all backend report queries for the Pet Shop Management System. All reports are implemented as Convex query functions with proper validators and type safety.

## Files

### 1. `salesReports.ts` - Sales & POS Analytics
Queries for sales performance, customer analysis, and cashier tracking.

**Functions:**
- `getSalesSummary` - Comprehensive sales overview with payment methods, top products, and daily trends
- `getSalesByCustomer` - Customer purchase history and spending analysis
- `getCashierPerformance` - Staff performance metrics

### 2. `inventoryReports.ts` - Inventory Management
Queries for stock levels, movements, and product performance.

**Functions:**
- `getStockSummary` - Overall inventory status with low stock alerts
- `getStockMovements` - Detailed stock movement audit trail
- `getLowStockItems` - Products below minimum stock threshold
- `getStockValuation` - Inventory value calculation by FIFO/Average cost
- `getBestSellingProducts` - Top products with profit margin analysis

### 3. `clinicReports.ts` - Veterinary Services
Queries for clinic appointments, patients, and medical services.

**Functions:**
- `getClinicSummary` - Clinic revenue, appointments, and service breakdown
- `getPatientReport` - Pet visit history and spending patterns
- `getServiceReport` - Medical service performance metrics
- `getDiagnosisReport` - Common diagnoses tracking

### 4. `hotelReports.ts` - Pet Boarding
Queries for hotel occupancy, room management, and guest tracking.

**Functions:**
- `getHotelSummary` - Booking statistics and occupancy rates
- `getRoomOccupancy` - Individual room performance
- `getGuestReport` - Customer and pet stay history
- `getHotelServicesReport` - Additional services revenue

### 5. `dashboardReports.ts` - Executive Dashboard
Queries for high-level KPIs and trend analysis.

**Functions:**
- `getMainDashboard` - Consolidated KPIs across all business modules with period comparison
- `getSalesTrend` - Revenue trends by day/week/month

## Common Patterns

### Query Structure
All queries follow the Convex v1.0+ syntax:

```typescript
export const myReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    // Return type definition
  }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Filters
Standard filters supported by all queries:
- **Date Range**: `startDate`, `endDate` (Unix timestamp)
- **Branch**: `branchId` (optional - omit for all branches)

### Data Filtering
All queries automatically handle:
- **Soft Deletes**: Filter out `deletedAt !== undefined`
- **Status**: Only include relevant statuses (Completed, CheckedOut, etc.)
- **Active Records**: `isActive === true` for master data

### Performance Optimization
- **Indexed Queries**: All filters use database indexes defined in schema
- **Aggregations**: Efficient Map-based aggregations for grouping
- **Lazy Loading**: Use conditional queries in frontend (`"skip"` pattern)

## Usage Example

```typescript
// Frontend component
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SalesReport() {
  const data = useQuery(api.reports.salesReports.getSalesSummary, {
    startDate: new Date('2025-01-01').getTime(),
    endDate: new Date('2025-01-31').getTime(),
    branchId: "branch123", // Optional
  });

  if (data === undefined) return <LoadingSpinner />;

  return <div>Revenue: {data.summary.totalRevenue}</div>;
}
```

## Type Safety

All queries include:
- ✅ Argument validators (`v.*`)
- ✅ Return type definitions
- ✅ TypeScript type inference
- ✅ Generated types in `_generated/api`

## Testing

### Manual Testing Checklist
- [ ] Query returns correct data structure
- [ ] Filters work properly (date, branch)
- [ ] Soft deletes respected
- [ ] Performance acceptable (<2s)
- [ ] Numbers calculated correctly

### Integration Testing
Test queries via Convex dashboard or frontend UI:
1. Navigate to `/dashboard/reports`
2. Select date range and branch
3. Verify data accuracy against database

## Maintenance

### Adding New Reports

1. Create function in appropriate file
2. Define args with validators
3. Define return type
4. Implement handler logic
5. Export function
6. Update this README

### Modifying Queries

1. Update validators if args change
2. Update return type if structure changes
3. Test with frontend UI
4. Update documentation

## Related Documentation

- `/doc/15-reporting-system.md` - Comprehensive reporting guide
- `/convex/schema.ts` - Database schema
- `/.cursor/rules/convex_rules.mdc` - Convex best practices

## Security

All queries:
- ✅ Use validators for input validation
- ✅ Respect authentication (user context available)
- ✅ No SQL injection (Convex is NoSQL)
- ✅ No sensitive data exposure (only business metrics)

**CodeQL Status:** ✅ No vulnerabilities detected

---

**Last Updated:** 2025-01-12
**Total Queries:** 18
**Total Lines:** 2,250+
**Language:** TypeScript (Convex)
