# Modul Penjualan (Sales Module) - Petshop Management System

## Overview
Modul penjualan lengkap dengan fitur diskon, multiple payment methods (Cash, QRIS, Credit), dan integrasi real-time stock management.

## Features Implemented

### 1. **Transaksi Penjualan**
- ✅ Create sale dengan multiple items
- ✅ Support produk dengan/tanpa varian
- ✅ Diskon per item (nominal & persentase)
- ✅ Diskon transaksi (nominal & persentase)
- ✅ Pajak (PPN) optional per transaksi
- ✅ Auto-fill harga jual dari produk/varian
- ✅ Real-time calculation subtotal, discount, tax, total

### 2. **Multiple Payment Methods**
- ✅ **Cash (Tunai)** - dengan perhitungan kembalian otomatis
- ✅ **QRIS** - input manual dengan nomor referensi
- ✅ **Credit (Kredit)** - track outstanding amount per customer
- ✅ **Bank Transfer** - support transfer bank
- ✅ **Debit Card** - support kartu debit
- ✅ Split payment (kombinasi metode dalam 1 transaksi)

### 3. **Stock Management**
- ✅ Stock berkurang otomatis saat transaksi completed
- ✅ Validasi ketersediaan stock sebelum submit
- ✅ COGS (Cost of Goods Sold) calculation dari average cost
- ✅ Stock movement logging dengan tipe `SALE_OUT`
- ✅ Error handling dengan detail produk jika stock tidak cukup

### 4. **Customer Management**
- ✅ Wajib pilih customer
- ✅ Default customer "UMUM" untuk walk-in
- ✅ Auto-select UMUM customer di form
- ✅ Search customer by name/phone/code
- ✅ Track outstanding credit per customer

### 5. **User Interface**
- ✅ Desktop-friendly form (follow Purchase Order pattern)
- ✅ Dialog untuk create sale dan pembayaran
- ✅ Real-time calculation preview
- ✅ Payment summary dengan kembalian/sisa tagihan
- ✅ Filter by status, branch, customer
- ✅ Badges untuk status (Draft, Completed, Cancelled)

## Database Schema

### `sales` (Transaction Header)
```typescript
{
  saleNumber: string,           // Auto: INV-YYYYMMDD-001
  branchId: Id<"branches">,
  customerId: Id<"customers">,
  saleDate: number,
  status: "Draft" | "Completed" | "Cancelled",
  subtotal: number,             // Sum of item subtotals
  discountAmount: number,       // Transaction discount
  discountType: "percent" | "nominal",
  taxAmount: number,
  taxRate: number,
  totalAmount: number,          // Final total
  paidAmount: number,           // Sum of payments
  outstandingAmount: number,    // Remaining balance
  notes: string,
  // Audit fields...
}
```

### `saleItems` (Line Items)
```typescript
{
  saleId: Id<"sales">,
  productId: Id<"products">,
  variantId?: Id<"productVariants">,
  quantity: number,
  unitPrice: number,            // Price at sale time
  discountAmount: number,       // Item discount
  discountType: "percent" | "nominal",
  subtotal: number,             // qty * price - discount
  cogs: number,                 // Cost from avgCost
  // Audit fields...
}
```

### `salePayments` (Payment Records)
```typescript
{
  saleId: Id<"sales">,
  amount: number,
  paymentMethod: "CASH" | "QRIS" | "CREDIT" | ...,
  referenceNumber?: string,     // For QRIS/bank
  paymentDate: number,
  notes?: string,
  // Audit fields...
}
```

## API Functions

### Convex Backend (`convex/sales.ts`)
- `create` - Create draft sale
- `addItem` - Add item to sale
- `updateItem` - Update item details
- `removeItem` - Remove item from sale
- `updateDiscountAndTax` - Update transaction discount & tax
- `submitSale` - Complete sale with payments (reduces stock)
- `cancel` - Cancel draft sale
- `list` - List sales with filters
- `get` - Get sale details with items & payments
- `getOutstandingByCustomer` - Get credit sales by customer

### Payment Management (`convex/salePayments.ts`)
- `addPayment` - Add payment record
- `removePayment` - Remove payment (draft only)
- `getBySale` - Get all payments for sale
- `listByMethod` - List payments by method
- `getSummaryByDateRange` - Payment summary report

### Stock Management (`convex/productStock.ts`)
- `reduceStockForSaleHelper` - Reduce stock and log movement
- Returns `{ cogs, avgCost }` for profit calculation

### Customer Functions (`convex/customers.ts`)
- `getOrCreateDefault` - Get UMUM customer
- `createDefaultCustomer` - Seed UMUM customer (run once)
- `search` - Search customers

## Usage Flow

### 1. **Setup (First Time)**
Jalankan mutation untuk create customer UMUM:
```typescript
// Di Convex dashboard atau via code
await ctx.mutation(api.customers.createDefaultCustomer, {});
```

### 2. **Create Sale Transaction**
1. Klik "Transaksi Baru" di halaman Penjualan
2. Pilih Customer (default: UMUM) dan Cabang
3. Tambahkan items:
   - Pilih produk (auto-fill harga)
   - Pilih varian (jika ada)
   - Input qty dan diskon (optional)
   - Klik "Tambah"
4. Set diskon transaksi & pajak (optional)
5. Klik "Lanjut ke Pembayaran"

### 3. **Process Payment**
1. Pilih metode pembayaran
2. Input jumlah bayar
3. Untuk QRIS: input nomor referensi
4. Klik "Tambah" (bisa multiple payments)
5. Review summary:
   - Kembalian (jika cash > total)
   - Sisa tagihan (jika credit)
6. Klik "Selesaikan Penjualan"

### 4. **Stock Reduction (Automatic)**
Saat "Selesaikan Penjualan":
- Stock berkurang per item
- COGS calculated dari avgCost
- Stock movement logged
- Error jika stock tidak cukup

## Calculation Logic

### Item Subtotal
```typescript
baseAmount = quantity * unitPrice
if (discountType === "percent") {
  subtotal = baseAmount - (baseAmount * discount / 100)
} else {
  subtotal = baseAmount - discount
}
```

### Transaction Total
```typescript
subtotal = sum(item.subtotal)
transactionDiscount = (discountType === "percent") 
  ? subtotal * discount / 100 
  : discount
afterDiscount = subtotal - transactionDiscount
tax = (taxRate > 0) ? afterDiscount * taxRate / 100 : 0
totalAmount = afterDiscount + tax
```

### Payment Calculation
```typescript
paidAmount = sum(payments.amount)
outstandingAmount = totalAmount - paidAmount
change = (paidAmount > totalAmount) ? paidAmount - totalAmount : 0
```

## Frontend Components

### Main Page (`app/dashboard/sales/page.tsx`)
- Sales list table with filters
- Create sale dialog (2-step: items → payment)
- Real-time calculations
- Payment method icons & badges
- Status badges (Draft/Completed/Cancelled)

### Navigation (`app/dashboard/layout.tsx`)
- Added "Penjualan" menu dengan icon Receipt
- Positioned as second item (setelah Dashboard)

## Testing Checklist

### ✅ Setup
- [x] Schema deployed ke Convex
- [x] API functions generated
- [x] No TypeScript errors
- [x] Navigation link added

### 🔲 Manual Testing (setelah `npm run dev`)
1. **Setup UMUM Customer**
   - [ ] Jalankan `createDefaultCustomer` di Convex dashboard
   - [ ] Verify customer muncul di dropdown

2. **Create Sale - Single Payment Cash**
   - [ ] Create sale dengan 2-3 items
   - [ ] Set diskon item (percent & nominal)
   - [ ] Set diskon transaksi
   - [ ] Add tax (PPN 11%)
   - [ ] Pay full dengan Cash
   - [ ] Check kembalian calculation
   - [ ] Verify stock berkurang
   - [ ] Check stock movements

3. **Create Sale - Multiple Payments**
   - [ ] Create sale
   - [ ] Pay 50% Cash + 50% QRIS
   - [ ] Input referensi QRIS
   - [ ] Verify payments tersimpan

4. **Create Sale - Credit (Partial Payment)**
   - [ ] Create sale
   - [ ] Pay 30% Cash, sisa Credit
   - [ ] Verify outstanding amount
   - [ ] Check `getOutstandingByCustomer`

5. **Create Sale - Insufficient Stock**
   - [ ] Create sale dengan qty > stock
   - [ ] Verify error message with product name
   - [ ] Check stock tidak berubah

6. **Variant Products**
   - [ ] Create sale dengan variant product
   - [ ] Verify variant price used
   - [ ] Check stock reduction per variant

7. **Discount Combinations**
   - [ ] Item discount 10% + Transaction discount Rp 5000
   - [ ] Item discount Rp 2000 + Transaction discount 5%
   - [ ] Verify calculations

8. **Tax Inclusive/Exclusive**
   - [ ] Sale tanpa pajak
   - [ ] Sale dengan PPN 11%
   - [ ] Verify tax calculation

9. **Cancel & Delete**
   - [ ] Cancel draft sale
   - [ ] Delete cancelled sale
   - [ ] Verify cannot cancel completed sale

10. **Filters & Search**
    - [ ] Filter by status
    - [ ] Filter by branch
    - [ ] Search by invoice number
    - [ ] Search by customer name

## Error Handling

### Stock Validation
```typescript
if (stock.quantity < saleQty) {
  throw new Error(
    `${productName} (${variantName}): Insufficient stock. ` +
    `Available: ${stock.quantity}, Required: ${saleQty}`
  );
}
```

### Payment Validation
```typescript
if (totalPayments > totalAmount && !hasCash) {
  throw new Error(
    "Total payments cannot exceed sale total (unless paying with cash)"
  );
}
```

## Future Enhancements

### Phase 2 (Optional)
- [ ] Print receipt/invoice
- [ ] Barcode scanner support
- [ ] Quick product search by SKU
- [ ] Customer credit limit checking
- [ ] Payment installment tracking
- [ ] Sales return/refund flow
- [ ] Sales analytics dashboard
- [ ] POS touch interface (tablet-friendly)
- [ ] QRIS payment gateway integration (Midtrans/Xendit)
- [ ] WhatsApp invoice sending

## Files Modified/Created

### Backend (Convex)
- ✅ `convex/schema.ts` - Added sales, saleItems, salePayments tables
- ✅ `convex/sales.ts` - Sales CRUD + submitSale
- ✅ `convex/salePayments.ts` - Payment management
- ✅ `convex/productStock.ts` - Added reduceStockForSaleHelper
- ✅ `convex/customers.ts` - Added search, getOrCreateDefault, createDefaultCustomer

### Frontend
- ✅ `app/dashboard/sales/page.tsx` - Sales CRUD page
- ✅ `app/dashboard/layout.tsx` - Added navigation link

### Documentation
- ✅ `/memories/petshop-sales-module.md` - Implementation context
- ✅ `SALES_MODULE_README.md` - This file

## Notes
- RBAC not enforced yet (project-wide TODO)
- Auth integration pending (createdBy/updatedBy fields set to undefined)
- Customer UMUM must be created before first sale
- Stock movements tracked with `SALE_OUT` type
- COGS captured at sale time for profit calculation
- Outstanding amounts tracked for credit sales reporting

## Support
Untuk pertanyaan atau issues, refer ke:
1. `.cursor/rules/convex_rules.mdc` - Convex development guidelines
2. `.github/copilot-instructions.md` - Project architecture
3. Memory: `/memories/petshop-sales-module.md` - Implementation details
