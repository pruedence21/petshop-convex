# Sistem Pelaporan Komprehensif

## Ringkasan

Sistem pelaporan komprehensif untuk Pet Shop Management System yang menyediakan analitik dan laporan detail untuk semua modul bisnis. Sistem ini dirancang dengan bahasa Indonesia dan menyediakan dashboard interaktif untuk pengambilan keputusan bisnis.

## Arsitektur

### Backend (Convex)

Semua laporan diimplementasikan sebagai Convex queries di folder `convex/reports/`:

```
convex/reports/
├── salesReports.ts         # Laporan Penjualan & POS
├── inventoryReports.ts     # Laporan Inventori & Stok
├── clinicReports.ts        # Laporan Klinik Hewan
├── hotelReports.ts         # Laporan Hotel Hewan
└── dashboardReports.ts     # Dashboard & KPI Analytics
```

### Frontend (Next.js)

Dashboard utama berada di `/app/dashboard/reports/page.tsx` dengan 5 tab kategori:
- Dashboard (KPI & Overview)
- Penjualan (Sales Analytics)
- Inventori (Stock Management)
- Klinik (Veterinary Services)
- Hotel (Pet Boarding)

## Modul Laporan

### 1. Dashboard Analytics (`dashboardReports.ts`)

#### `getMainDashboard`
**KPI Utama untuk seluruh bisnis**

**Parameters:**
- `startDate`: Tanggal mulai periode
- `endDate`: Tanggal akhir periode
- `branchId`: (Optional) Filter cabang
- `compareWithPreviousPeriod`: (Optional) Bandingkan dengan periode sebelumnya

**Returns:**
- **KPIs:**
  - Total Pendapatan (dengan perubahan %)
  - Pendapatan per kategori (Sales, Clinic, Hotel)
  - Total Transaksi & Rata-rata nilai transaksi
  - Pelanggan Aktif & Pelanggan Baru
  - Nilai Inventori & Alert stok rendah
  - Piutang Usaha dengan threshold alert

- **Revenue Breakdown:** Persentase kontribusi per kategori bisnis
- **Top Performers:** 
  - Top 5 Produk Terlaris
  - Top 5 Pelanggan Terbaik

**Contoh Penggunaan:**
```typescript
const dashboard = useQuery(api.reports.dashboardReports.getMainDashboard, {
  startDate: new Date('2025-01-01').getTime(),
  endDate: new Date('2025-01-31').getTime(),
  branchId: "branch123",
  compareWithPreviousPeriod: true,
});
```

#### `getSalesTrend`
**Trend penjualan berdasarkan periode**

**Parameters:**
- `startDate`, `endDate`, `branchId`
- `groupBy`: "day" | "week" | "month"

**Returns:** Array dengan revenue per periode (sales, clinic, hotel)

---

### 2. Sales Reports (`salesReports.ts`)

#### `getSalesSummary`
**Ringkasan penjualan komprehensif**

**Returns:**
- **Summary:**
  - Total Sales, Transactions, Revenue
  - Average Transaction Value
  - Total Items Sold
  - Discount & Tax breakdown
  - Completed vs Cancelled sales

- **Payment Methods:** Detail per metode pembayaran dengan persentase
- **Top Products:** Top 10 produk dengan quantity & revenue
- **Sales by Day:** Trend harian penjualan

#### `getSalesByCustomer`
**Laporan penjualan per pelanggan**

**Parameters:**
- `limit`: (Optional) Batasi jumlah hasil (default: semua)

**Returns:** Array pelanggan dengan total transaksi, revenue, discount, rata-rata

#### `getCashierPerformance`
**Performa kasir/staff penjualan**

**Returns:** Ranking kasir berdasarkan:
- Total Transaksi
- Total Revenue
- Average Transaction
- Total Items Sold

---

### 3. Inventory Reports (`inventoryReports.ts`)

#### `getStockSummary`
**Ringkasan stok keseluruhan**

**Parameters:**
- `branchId`: (Optional) Filter cabang
- `categoryId`: (Optional) Filter kategori produk

**Returns:**
- Total Products & SKUs
- Total Stock Value (IDR)
- Low Stock Items Count
- Out of Stock Items Count
- Excess Stock Items Count
- Stock by Category (nilai per kategori)

#### `getLowStockItems`
**Produk dengan stok rendah atau habis**

**Returns:** Array produk dengan:
- Product Name, SKU, Category
- Branch Name
- Current Stock, Min Stock, Max Stock
- Stock Value
- Status: "Out of Stock" | "Low Stock"

**Alert Mechanism:** Otomatis muncul di dashboard jika ada item stok rendah.

#### `getBestSellingProducts`
**Produk terlaris dengan analisa profit**

**Parameters:**
- `limit`: (Optional) Top N products

**Returns:** Array dengan:
- Product Info
- Quantity Sold
- Revenue
- **Profit** (revenue - COGS)
- **Profit Margin** (%)

#### `getStockValuation`
**Valuasi nilai stok per tanggal**

**Parameters:**
- `asOfDate`: Tanggal valuasi

**Returns:**
- Total Value
- Item Count
- Detail per product dengan average cost

#### `getStockMovements`
**Riwayat pergerakan stok**

**Parameters:**
- `startDate`, `endDate`
- `productId`: (Optional) Filter produk
- `movementType`: (Optional) Filter tipe (PURCHASE_IN, SALE_OUT, dll)

**Returns:** Detail setiap movement dengan referensi transaksi

---

### 4. Clinic Reports (`clinicReports.ts`)

#### `getClinicSummary`
**Ringkasan layanan klinik**

**Returns:**
- **Summary:**
  - Total Appointments (Completed, Cancelled, Scheduled)
  - Total Revenue & Average Revenue
  - Total Patients (unique pets)
  - Outstanding Amount (piutang)

- **Service Revenue:** Pendapatan per jenis layanan dengan persentase
- **Staff Performance:** Revenue per dokter hewan/staff
- **Appointments by Day:** Trend janji temu harian

#### `getPatientReport`
**Laporan per pasien (hewan)**

**Returns:** Array dengan:
- Pet Name, Owner Name
- Animal Type
- Visit Count
- Total Spent
- Last Visit Date
- Outstanding Amount

#### `getServiceReport`
**Analisa layanan klinik**

**Returns:** Setiap layanan dengan:
- Times Performed
- Total Revenue
- Average Price per service

#### `getDiagnosisReport`
**Laporan diagnosis penyakit**

**Returns:** Diagnosis paling umum dengan:
- Diagnosis Name
- Count (jumlah kasus)
- Animal Types (jenis hewan yang terkena)

---

### 5. Hotel Reports (`hotelReports.ts`)

#### `getHotelSummary`
**Ringkasan hotel hewan**

**Returns:**
- **Summary:**
  - Total Bookings (CheckedIn, CheckedOut, Cancelled)
  - Total Revenue (Room, Services, Consumables)
  - **Occupancy Rate** (%)
  - Average Stay Duration (days)
  - Outstanding Amount

- **Revenue by Room Type:** Breakdown pendapatan per tipe kamar
- **Bookings by Day:** Check-ins, Check-outs, Occupancy per hari

#### `getRoomOccupancy`
**Okupansi detail per kamar**

**Returns:** Setiap kamar dengan:
- Room Name, Type
- Total Bookings
- Total Days Occupied
- **Occupancy Rate** (%)
- Revenue

#### `getGuestReport`
**Laporan tamu hotel**

**Returns:** Customer & Pet pairs dengan:
- Total Stays
- Total Nights
- Total Spent
- Last Check-in
- Outstanding Amount

#### `getHotelServicesReport`
**Layanan tambahan hotel**

**Returns:** Services dengan times provided & revenue

---

## Filter & Parameters

### Filter Universal
Semua laporan mendukung filter berikut:
- **Date Range:** `startDate` dan `endDate` (timestamp)
- **Branch:** `branchId` (optional, jika tidak ada = semua cabang)

### Soft Deletes
Semua query secara otomatis memfilter record yang di-delete (`deletedAt !== undefined`).

### Status Filtering
- **Sales:** Hanya "Completed" untuk revenue
- **Clinic:** Hanya "Completed" untuk revenue
- **Hotel:** "CheckedOut" untuk revenue, "CheckedIn" untuk occupancy

---

## Dashboard UI

### Struktur
```
/app/dashboard/reports/
└── page.tsx (1200+ baris)
    ├── Filter Section (Date, Branch)
    ├── Tabs (5 kategori)
    │   ├── Dashboard (KPI Cards + Charts)
    │   ├── Sales (Tables + Summary)
    │   ├── Inventory (Alerts + Tables)
    │   ├── Clinic (Services + Staff)
    │   └── Hotel (Occupancy + Rooms)
    └── Loading States
```

### Komponen UI
- **KPI Cards:** 4 metric cards dengan trend indicators
- **Tables:** shadcn/ui Table dengan sorting & pagination
- **Tabs:** Tab navigation antar kategori
- **Alerts:** Warning cards untuk stok rendah & piutang tinggi
- **Progress Bars:** Visualisasi breakdown revenue

### Format Data
```typescript
// Currency (IDR)
formatCurrency(100000) // "Rp100.000"

// Number
formatNumber(1500) // "1.500"

// Percentage
formatPercent(75) // "75,0%"

// Date
formatDate("2025-01-15") // "15 Januari 2025"
```

---

## Alert System

### Threshold Alerts
Dashboard menampilkan alert otomatis untuk:

1. **Low Stock Alert**
   - Trigger: `lowStockItems > 0`
   - Display: Count + daftar produk

2. **High AR Alert**
   - Trigger: `accountsReceivable > totalRevenue * 0.3`
   - Threshold: 30% dari revenue
   - Display: Total AR amount

3. **Out of Stock Alert**
   - Trigger: `currentStock === 0`
   - Display: Red badge pada inventory tab

---

## Performance Optimization

### Query Optimization
1. **Conditional Loading:** Queries hanya load saat tab aktif
2. **Indexed Queries:** Semua filter menggunakan database indexes
3. **Pagination:** Top N results untuk large datasets

### Frontend Optimization
1. **Loading States:** Skeleton screens untuk better UX
2. **Memoization:** React hooks untuk prevent re-renders
3. **Lazy Loading:** Tab content load on-demand

---

## Usage Examples

### Basic Dashboard Query
```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MyReport() {
  const startDate = new Date('2025-01-01').getTime();
  const endDate = new Date('2025-01-31').getTime();

  const data = useQuery(api.reports.salesReports.getSalesSummary, {
    startDate,
    endDate,
  });

  if (data === undefined) return <div>Loading...</div>;

  return (
    <div>
      <h1>Total Revenue: {data.summary.totalRevenue}</h1>
      <h2>Transactions: {data.summary.totalTransactions}</h2>
    </div>
  );
}
```

### Filter dengan Branch
```typescript
const [selectedBranch, setSelectedBranch] = useState<Id<"branches"> | undefined>();

const data = useQuery(api.reports.inventoryReports.getStockSummary, {
  branchId: selectedBranch,
});
```

### Comparative Period
```typescript
const dashboard = useQuery(api.reports.dashboardReports.getMainDashboard, {
  startDate,
  endDate,
  compareWithPreviousPeriod: true, // Otomatis hitung periode sebelumnya
});

// Access trend
dashboard?.kpis.totalRevenue.change // Percentage change
dashboard?.kpis.totalRevenue.trend  // "up" | "down" | "stable"
```

---

## Future Enhancements

### Planned Features
1. **Charts & Visualizations**
   - Line charts untuk trends
   - Pie charts untuk breakdowns
   - Bar charts untuk comparisons

2. **Export Functionality**
   - PDF reports dengan logo & header
   - Excel export untuk data analysis
   - Email scheduled reports

3. **Custom Report Builder**
   - Drag-drop field selector
   - Custom date ranges
   - Save favorite reports

4. **Advanced Filters**
   - Multiple branch selection
   - Product category filters
   - Customer segment filters

5. **Scheduled Reports**
   - Daily/Weekly/Monthly automation
   - Email delivery
   - Report history archive

---

## Maintenance

### Adding New Reports

1. **Create Query Function** (`convex/reports/*.ts`)
```typescript
export const getMyNewReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    // Define return type
  }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

2. **Add to Frontend** (`app/dashboard/reports/page.tsx`)
```typescript
const myData = useQuery(
  api.reports.myReports.getMyNewReport,
  activeTab === "mytab" ? { startDate, endDate } : "skip"
);
```

3. **Add Tab UI**
```tsx
<TabsContent value="mytab">
  {/* Render tables/cards */}
</TabsContent>
```

### Testing Checklist
- [ ] Query returns correct data structure
- [ ] Filters work properly (date, branch)
- [ ] Soft deletes respected
- [ ] Numbers formatted correctly (IDR)
- [ ] Loading states display
- [ ] No TypeScript errors
- [ ] Performance acceptable (<2s load)

---

## Troubleshooting

### Common Issues

**Issue:** Query returns undefined
- **Cause:** Loading state or no data
- **Fix:** Check `if (data === undefined)` condition

**Issue:** Wrong totals
- **Cause:** Not filtering deleted records or wrong status
- **Fix:** Add `!record.deletedAt` and `status === "Completed"` filters

**Issue:** Slow performance
- **Cause:** Missing indexes or large dataset
- **Fix:** Add index to schema, use pagination/limits

**Issue:** Type errors
- **Cause:** Generated types not updated
- **Fix:** Run `npx convex dev` to regenerate types

---

## Related Documentation
- `doc/01-project-overview.md` - System architecture
- `doc/10-accounting-module.md` - Financial reports
- `.cursor/rules/convex_rules.mdc` - Convex patterns
- `convex/schema.ts` - Database schema

---

**Last Updated:** 2025-01-12
**Version:** 1.0.0
**Author:** Copilot Coding Agent
