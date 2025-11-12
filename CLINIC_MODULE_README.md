# 🏥 Modul Klinik Hewan - Petshop Management System

Modul klinik hewan dengan appointment scheduling, medical records management, prescription tracking, dan service billing.

## ✅ Status Implementasi

### Fase 1: Database & Core Services ✅ SELESAI
- ✅ Schema database (6 tabel baru)
- ✅ CRUD `clinicServiceCategories` 
- ✅ CRUD `clinicServices`
- ✅ CRUD `clinicStaff`

### Fase 2: Appointment System ✅ SELESAI  
- ✅ Multi-step appointment flow (create → add services → payment)
- ✅ Staff availability checking
- ✅ Reschedule support
- ✅ Prescription management (pickup flow)
- ✅ Stock integration (auto-reduce on completion)
- ✅ Basic appointment UI

### Fase 3: Medical Records & Packages 🚧 PARTIAL
- ✅ CRUD `petMedicalRecords`
- ✅ Auto-create from completed appointments
- ⏳ Service packages (schema ready, functions pending)
- ⏳ Medical records UI
- ⏳ Package subscription management

---

## 📊 Database Schema

### 1. `clinicServiceCategories`
Kategori layanan klinik (Medical, Grooming, Boarding)
```typescript
{
  code: string,           // "MEDICAL", "GROOMING", "BOARDING"
  name: string,           // "Layanan Medis"
  description: string,
  icon: string,           // Lucide icon name
  color: string,          // UI color
  isActive: boolean
}
```

### 2. `clinicServices`
Katalog layanan dengan pricing dan durasi
```typescript
{
  code: string,              // "MED001", "GRM001"
  name: string,              // "Checkup General"
  categoryId: Id,
  basePrice: number,         // 150000
  duration: number,          // 30 (minutes)
  requiresInventory: boolean // true = consume products
}
```

### 3. `clinicStaff`
Veterinarian, groomer, nurses
```typescript
{
  code: string,           // "DRH001"
  name: string,           // "drh. Budi Santoso"
  role: string,           // "Veterinarian", "Groomer", "Nurse"
  specialization: string, // "Small Animals"
  branchId: Id,          // Assigned branch
  phone, email
}
```

### 4. `clinicAppointments` (Transaction Header)
Appointment dengan multi-service support
```typescript
{
  appointmentNumber: string,  // "APT-20251112-001"
  branchId, petId, customerId, staffId,
  appointmentDate: number,    // Timestamp
  appointmentTime: string,    // "09:00", "09:30"
  status: string,             // "Scheduled", "Completed", "Cancelled"
  subtotal, discountAmount, discountType,
  taxAmount, taxRate,
  totalAmount, paidAmount, outstandingAmount
}
```

### 5. `clinicAppointmentServices` (Line Items)
Services per appointment dengan prescription support
```typescript
{
  appointmentId, serviceId,
  productId?: Id,            // For inventory-linked services
  variantId?: Id,
  quantity, unitPrice, discountAmount, subtotal,
  isPrescription: boolean,   // true = pickup flow
  prescriptionDosage: string, // "2x sehari, 5 hari"
  prescriptionPickedUp: boolean,
  prescriptionPickupDate: number,
  notes: string              // Diagnosis/treatment notes
}
```

### 6. `clinicPayments`
Payment records (pattern sama dengan `salePayments`)
```typescript
{
  appointmentId,
  amount, paymentMethod,      // CASH, QRIS, CREDIT, etc.
  referenceNumber, paymentDate
}
```

### 7. `clinicServicePackages` ⏳ (Schema Ready)
Service packages dengan diskon
```typescript
{
  code, name, description,
  packageServices: [{ serviceId, quantity }],
  packagePrice: number,      // Discounted vs individual
  validityDays: number       // Package expires after X days
}
```

### 8. `clinicPackageSubscriptions` ⏳ (Schema Ready)
Customer package purchases dengan usage tracking
```typescript
{
  customerId, packageId,
  purchaseDate, expiresAt,
  remainingServices: [{ serviceId, remainingQuantity }],
  usageHistory: [{ appointmentId, serviceId, usedQuantity, usedDate, branchId }],
  status: "Active" | "Expired" | "FullyUsed"
}
```

---

## 🔄 Transaction Flow

### Create Appointment (Scheduled Status)
```typescript
const { appointmentId } = await api.clinicAppointments.create({
  branchId, petId, customerId, staffId,
  appointmentDate, appointmentTime, notes
});
```
**Validations:**
- Staff availability check (no double-booking)
- Auto-generates `APT-YYYYMMDD-001` number

### Add Services (Draft Mode)
```typescript
await api.clinicAppointments.addService({
  appointmentId,
  serviceId,
  quantity, unitPrice,
  isPrescription: false,    // false = reduce stock on completion
  productId, variantId,     // For inventory-linked services
  notes: "Diagnosis here"
});
```
**Features:**
- Auto-recalculates totals
- Supports service-level discount
- Prescription flag for pickup flow

### Submit Appointment (Scheduled → Completed)
```typescript
await api.clinicAppointments.submitAppointment({
  appointmentId,
  payments: [
    { amount: 500000, paymentMethod: "CASH" },
    { amount: 100000, paymentMethod: "QRIS", referenceNumber: "QR123" }
  ]
});
```
**Process:**
1. Validate payments (allow partial for credit)
2. Loop through services:
   - If `isPrescription = false` AND `productId` exists → reduce stock via `reduceStockForSaleHelper`
   - If `isPrescription = true` → skip (pickup nanti)
3. Insert payment records
4. Update status to `Completed`
5. Return change if overpayment (CASH only)

### Prescription Pickup (Stock Reduction)
```typescript
await api.clinicAppointments.pickupPrescription({
  serviceItemId  // ID dari clinicAppointmentServices
});
```
**Process:**
- Validate `isPrescription = true`
- Check `prescriptionPickedUp = false`
- Reduce stock via `reduceStockForSaleHelper`
- Mark `prescriptionPickedUp = true`, set pickup date

### Reschedule Appointment
```typescript
await api.clinicAppointments.reschedule({
  appointmentId,
  appointmentDate: newDate,
  appointmentTime: "14:00",
  staffId: newStaffId  // Optional
});
```
**Validations:**
- Only for `status = "Scheduled"`
- Check new staff availability

---

## 🏥 Business Rules

### Time Slots
- **Operating Hours:** 08:00 - 17:00
- **Slot Interval:** 30 minutes (09:00, 09:30, 10:00, ...)
- **Duration:** Based on service (checkup 30min, grooming 120min)
- **Collision Detection:** via `clinicStaff.checkAvailability` query

### Stock Management
**Non-Prescription Services:**
- Stock reduced immediately on appointment completion
- Example: Vaksinasi → `reduceStockForSaleHelper` called during `submitAppointment`

**Prescription Services:**
- Stock NOT reduced on completion
- Customer picks up later → staff calls `pickupPrescription` mutation
- Prescription status: `prescriptionPickedUp` flag

**Movement Logging:**
- Type `SALE_OUT` (reuses sale pattern)
- Reference: `appointmentId`

### Payment Handling
- **Multiple methods** per appointment (same as sales)
- **Partial payment** allowed (credit tracking via `outstandingAmount`)
- **Overpayment:** CASH only (calculates change)

---

## 📋 Seed Data

### Default Categories (3)
```typescript
await api.clinicSeed.seedClinicData({});
```
Creates:
1. **Layanan Medis** (MEDICAL)
   - Checkup General (Rp 150k, 30min)
   - Vaksinasi Rabies (Rp 250k, 15min, requires inventory)
   - Vaksinasi Distemper (Rp 200k, 15min)
   - Sterilisasi Kucing (Rp 500k, 120min)
   - Konsultasi Dokter (Rp 100k, 30min)

2. **Grooming** (GROOMING)
   - Grooming Basic (Rp 200k, 120min)
   - Grooming Premium (Rp 350k, 180min)
   - Potong Kuku (Rp 50k, 15min)

3. **Penitipan** (BOARDING)
   - Penitipan Kucing - 1 Hari (Rp 75k, 30min)
   - Penitipan Anjing - 1 Hari (Rp 100k, 30min)

### Default Staff (3)
- drh. Budi Santoso (Veterinarian, Small Animals)
- drh. Siti Nurhaliza (Veterinarian, Cats & Dogs)
- Andi Groomer (Groomer, All Breeds)

---

## 🖥️ UI Routes

### Implemented ✅
- `/dashboard/clinic/appointments` - Appointment list & create

### Pending ⏳
- `/dashboard/clinic/appointments/[id]` - Appointment detail (add services, payments)
- `/dashboard/clinic/medical-records` - Medical records by pet
- `/dashboard/clinic/services` - Service catalog management
- `/dashboard/clinic/packages` - Package management
- `/dashboard/clinic/staff` - Staff management

---

## 🔧 Helper Functions

### Stock Helpers
```typescript
// From productStock.ts (reused from sales)
await reduceStockForSaleHelper(ctx, {
  branchId, productId, variantId,
  quantity,
  saleId: appointmentId  // Reuse sale reference
});
```

### Medical Record Auto-Creation
```typescript
await api.petMedicalRecords.createFromAppointment({
  appointmentId
});
```
**Aggregates:**
- Diagnosis: from `clinicAppointmentServices.notes`
- Treatment: service names + quantities
- Prescription: product + dosage + quantity
- Veterinarian: staff name
- Clinic: branch name

---

## 🚀 Next Steps (Prioritized)

### 1. Complete Appointment Detail Page
Create `/dashboard/clinic/appointments/[id]/page.tsx`:
- Add services form (like sales items)
- Prescription checkbox + dosage input
- Payment dialog (reuse sales pattern)
- Stock availability warning

### 2. Medical Records UI
Create `/dashboard/clinic/medical-records/page.tsx`:
- Filter by pet (dropdown)
- Timeline view (chronological)
- View/edit/delete records
- Link to appointment detail

### 3. Service Management UI
Create `/dashboard/clinic/services/page.tsx`:
- CRUD for services
- Category filter
- Toggle `requiresInventory` flag
- Duration input (minutes)

### 4. Package System (Fase 3)
Implement:
- Package CRUD functions
- Subscription purchase flow
- Usage deduction on appointment
- Expiry checking

### 5. Reports & Analytics (Fase 4)
Create `/dashboard/clinic/reports/page.tsx`:
- Revenue by service type (chart)
- Vaccination reminders (table)
- Outstanding payments (list)
- Staff productivity (appointments count)

---

## 🐛 Known Issues & TODOs

### Critical
- ❌ Auth integration pending (`createdBy`/`updatedBy` = `undefined`)
- ❌ Package functions not implemented (schema ready)

### Enhancements
- ⏳ Calendar view for appointments (use `react-big-calendar`)
- ⏳ SMS/Email reminders (Convex scheduled functions)
- ⏳ Recurring appointments
- ⏳ Staff schedule management (shift patterns, cuti)
- ⏳ Batch tracking for vaccines (expiry date)
- ⏳ Insurance claim support

### Performance
- ✅ Index-first queries (compliant)
- ✅ Soft deletes everywhere
- ✅ Validator returns on all mutations

---

## 📖 Usage Examples

### Complete Appointment Flow
```typescript
// 1. Create appointment
const { appointmentId } = await createAppointment({
  branchId: "...", petId: "...", customerId: "...", staffId: "...",
  appointmentDate: Date.now(), appointmentTime: "09:00"
});

// 2. Add checkup service
await addService({
  appointmentId,
  serviceId: checkupServiceId,
  quantity: 1, unitPrice: 150000,
  notes: "Demam 3 hari, nafsu makan turun"
});

// 3. Add prescription
await addService({
  appointmentId,
  serviceId: consultationServiceId,
  quantity: 1, unitPrice: 100000,
  isPrescription: true,
  productId: amoxicillinId,  // From products table
  prescriptionDosage: "2x sehari setelah makan, 5 hari"
});

// 4. Submit with payment
await submitAppointment({
  appointmentId,
  payments: [{ amount: 250000, paymentMethod: "CASH" }]
});
// → Checkup stock unchanged (no product linked)
// → Prescription NOT reduced (pickup later)

// 5. Customer picks up prescription
await pickupPrescription({ serviceItemId: prescriptionItemId });
// → Stock reduced now
// → prescriptionPickedUp = true

// 6. Auto-create medical record
await createFromAppointment({ appointmentId });
// → Creates petMedicalRecord with aggregated data
```

---

## 🎯 Design Decisions

### Why Separate `clinicAppointments` from `sales`?
- Different business logic (time slots, staff, prescriptions)
- Medical-specific fields (diagnosis, treatment, prescriptions)
- Future: Insurance claims, medical certificates
- Simpler queries (no mixing retail vs clinic)

### Why Pickup Flow for Prescriptions?
- Customer may pick up later (next day)
- Stock availability at pickup time might differ
- Allows staff to print prescription label separately
- Matches real-world pharmacy workflow

### Why Reuse `reduceStockForSaleHelper`?
- Same inventory logic (FIFO, average cost, movement logging)
- Reduces code duplication
- Proven pattern from sales module
- Stock movements unified for reporting

### Why Service Packages in Separate Tables?
- Flexible quantity (not 1:1 with services)
- Usage tracking across multiple appointments
- Expiry date management
- Cross-branch usage support

---

## 📞 Support

Untuk pertanyaan atau issue terkait modul klinik, silakan:
1. Check documentation ini
2. Review existing similar patterns (sales module)
3. Test dengan seed data terlebih dahulu
4. Pastikan indexes defined untuk query performance

**Last Updated:** November 12, 2025
**Version:** 1.0.0 (Fase 1 & 2 Complete)
