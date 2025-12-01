import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // ==================== USER MANAGEMENT ====================

  // User Profiles (extends authTables users with additional info)
  userProfiles: defineTable({
    userId: v.string(), // Reference to authTables users._id (stored as string)
    name: v.string(), // Full name
    email: v.string(), // Denormalized for quick access
    phone: v.optional(v.string()),
    branchId: v.optional(v.id("branches")), // Primary branch assignment
    roleId: v.optional(v.id("roles")), // Primary role
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    createdBy: v.optional(v.string()), // userId string (can't use v.id since auth users are special)
    updatedBy: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"])
    .index("by_branch", ["branchId"])
    .index("by_role", ["roleId"])
    .index("by_is_active", ["isActive"]),

  // User-Role Junction (for multiple roles per user if needed in future)
  userRoles: defineTable({
    userId: v.string(), // Reference to authTables users._id
    roleId: v.id("roles"),
    assignedBy: v.optional(v.string()), // userId string
    assignedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user_id", ["userId"])
    .index("by_role_id", ["roleId"])
    .index("by_user_and_role", ["userId", "roleId"]),

  // ==================== ROLE & PERMISSION ====================
  roles: defineTable({
    name: v.string(), // Admin, Manager, Staff, Kasir
    description: v.optional(v.string()),
    permissions: v.array(v.string()), // ["users.create", "users.read", "products.update", etc]
    isActive: v.boolean(),
    createdBy: v.optional(v.string()), // userId string
    updatedBy: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  }).index("by_name", ["name"]),

  // ==================== MASTER DATA ====================

  // 1. Jenis Hewan (Animal Types)
  animalCategories: defineTable({
    name: v.string(), // Anjing, Kucing, Burung, Ikan
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  }).index("by_name", ["name"]),

  animalSubcategories: defineTable({
    categoryId: v.id("animalCategories"),
    name: v.string(), // Ras Kecil, Ras Sedang, Ras Besar
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_category", ["categoryId"])
    .index("by_name", ["name"]),

  // 2. Satuan Produk (Product Units)
  units: defineTable({
    code: v.string(), // pcs, kg, liter, box, pack
    name: v.string(),
    description: v.optional(v.string()),
    isBase: v.boolean(), // true for base units (pcs, kg, liter)
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Unit Conversions (multi-level)
  unitConversions: defineTable({
    fromUnitId: v.id("units"),
    toUnitId: v.id("units"),
    conversionFactor: v.number(), // 1 box = 12 pcs (factor = 12)
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_from_unit", ["fromUnitId"])
    .index("by_to_unit", ["toUnitId"]),

  // 3. Merek Produk (Product Brands)
  brands: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()), // URL or storageId
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Kategori Produk (Product Categories)
  productCategories: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Sub-Kategori Produk (Product Subcategories)
  productSubcategories: defineTable({
    categoryId: v.id("productCategories"),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_category", ["categoryId"])
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // 4. Cabang/Lokasi (Branches)
  branches: defineTable({
    code: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // 5. Katalog Produk (Product Catalog)
  products: defineTable({
    sku: v.string(),
    barcode: v.optional(v.string()), // Barcode from supplier
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("productCategories"),
    subcategoryId: v.optional(v.id("productSubcategories")),
    brandId: v.id("brands"),
    unitId: v.id("units"),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    minStock: v.number(),
    maxStock: v.number(),
    hasVariants: v.boolean(),
    hasExpiry: v.optional(v.boolean()), // Track expiry date for this product
    type: v.optional(v.string()), // "product" (default), "medicine" (obat), "procedure" (tindakan), "service" (layanan)
    serviceDuration: v.optional(v.number()), // Duration in minutes for services/procedures
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sku", ["sku"])
    .index("by_barcode", ["barcode"])
    .index("by_name", ["name"])
    .index("by_category", ["categoryId"])
    .index("by_brand", ["brandId"])
    .index("by_type", ["type"]),

  // Product Variants
  productVariants: defineTable({
    productId: v.id("products"),
    variantName: v.string(), // Size, Weight, Color, etc
    variantValue: v.string(), // 1kg, 5kg, 10kg
    sku: v.string(), // Unique SKU for this variant
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_product", ["productId"])
    .index("by_sku", ["sku"]),

  // Product Images
  productImages: defineTable({
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    imageUrl: v.string(), // URL or storageId
    isPrimary: v.boolean(),
    sortOrder: v.number(),
    createdBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"]),

  // Product Stock per Branch
  productStock: defineTable({
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    averageCost: v.number(), // Weighted average cost for valuation
    batchNumber: v.optional(v.string()),
    expiredDate: v.optional(v.number()),
    lastUpdated: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_branch", ["branchId"])
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"])
    .index("by_branch_product", ["branchId", "productId"]),

  // Product Stock Batches (for Expiry Date Management)
  productStockBatches: defineTable({
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    batchNumber: v.string(),
    expiredDate: v.number(),
    quantity: v.number(), // Current remaining quantity
    initialQuantity: v.number(),
    purchaseOrderId: v.optional(v.id("purchaseOrders")),
    receivedDate: v.number(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_branch_product", ["branchId", "productId"])
    .index("by_expiry", ["expiredDate"])
    .index("by_product_expiry", ["productId", "expiredDate"]), // For FEFO lookup

  // ==================== PURCHASE & INVENTORY ====================

  // Purchase Orders
  purchaseOrders: defineTable({
    poNumber: v.string(), // PO-YYYYMMDD-001
    supplierId: v.id("suppliers"),
    branchId: v.id("branches"), // Destination branch
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    status: v.string(), // Draft, Submitted, Received, Cancelled
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_po_number", ["poNumber"])
    .index("by_supplier", ["supplierId"])
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"])
    .index("by_order_date", ["orderDate"]),

  // Purchase Order Items
  purchaseOrderItems: defineTable({
    purchaseOrderId: v.id("purchaseOrders"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(), // Ordered quantity
    receivedQuantity: v.number(), // Actually received (for partial receiving)
    unitPrice: v.number(),
    discount: v.optional(v.number()),
    tax: v.optional(v.number()),
    subtotal: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_purchase_order", ["purchaseOrderId"])
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"]),

  // Stock Movements (Audit Log)
  stockMovements: defineTable({
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    movementType: v.string(), // PURCHASE_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, SALE_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN, DAMAGE_OUT, INITIAL_STOCK
    quantity: v.number(), // Positive for IN, negative for OUT
    referenceType: v.string(), // PurchaseOrder, Adjustment, Transfer, Sale, etc
    referenceId: v.string(), // ID of related document
    movementDate: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_branch", ["branchId"])
    .index("by_product", ["productId"])
    .index("by_movement_date", ["movementDate"])
    .index("by_reference", ["referenceType", "referenceId"])
    .index("by_movement_type", ["movementType"]),

  // 6. Supplier
  suppliers: defineTable({
    code: v.string(),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    paymentTerms: v.string(), // Net 30, Net 60, COD
    rating: v.number(), // 1-5
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_rating", ["rating"]),

  // 7. Customer
  customers: defineTable({
    code: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()), // L, P
    idNumber: v.optional(v.string()), // KTP/ID
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_phone", ["phone"]),

  // Customer's Pets
  customerPets: defineTable({
    customerId: v.id("customers"),
    name: v.string(),
    categoryId: v.id("animalCategories"),
    subcategoryId: v.optional(v.id("animalSubcategories")),
    breed: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()), // L, P
    weight: v.optional(v.number()), // in kg
    color: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_category", ["categoryId"]),

  // Pet Vaccination Records
  petVaccinations: defineTable({
    petId: v.id("customerPets"),
    vaccineName: v.string(),
    vaccineDate: v.number(),
    nextVaccineDate: v.optional(v.number()),
    veterinarian: v.optional(v.string()),
    clinic: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_pet", ["petId"])
    .index("by_vaccine_date", ["vaccineDate"]),

  // Pet Medical Records
  petMedicalRecords: defineTable({
    petId: v.id("customerPets"),
    recordDate: v.number(),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    prescription: v.optional(v.string()),
    veterinarian: v.optional(v.string()),
    clinic: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_pet", ["petId"])
    .index("by_record_date", ["recordDate"]),

  // ==================== VETERINARY CLINIC ====================

  // Clinic Service Categories (Medical, Grooming, Boarding)
  clinicServiceCategories: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()), // For UI categorization
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Clinic Services Catalog
  clinicServices: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("clinicServiceCategories"),
    basePrice: v.number(),
    duration: v.number(), // in minutes (30, 60, 120)
    requiresInventory: v.boolean(), // If true, service consumes products
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_category", ["categoryId"]),

  // Clinic Staff (Veterinarians, Groomers, Nurses)
  clinicStaff: defineTable({
    code: v.string(),
    name: v.string(),
    role: v.string(), // Veterinarian, Groomer, Nurse
    specialization: v.optional(v.string()), // e.g., "Small Animals", "Large Animals", "Exotic"
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    branchId: v.id("branches"),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"])
    .index("by_branch", ["branchId"])
    .index("by_role", ["role"]),

  // Clinic Appointments (Transaction Header)
  clinicAppointments: defineTable({
    appointmentNumber: v.string(), // APT-YYYYMMDD-001
    branchId: v.id("branches"),
    petId: v.id("customerPets"),
    customerId: v.id("customers"), // Denormalized for easy access
    staffId: v.id("clinicStaff"), // Assigned veterinarian/groomer
    appointmentDate: v.number(), // Date only (timestamp at 00:00)
    appointmentTime: v.string(), // Time slot "09:00", "09:30", etc.
    status: v.string(), // Scheduled, InProgress, Completed, Cancelled

    // Clinical Examination Data
    chiefComplaint: v.optional(v.string()), // Keluhan utama
    temperature: v.optional(v.number()), // Suhu tubuh (Celsius)
    weight: v.optional(v.number()), // Berat badan (kg)
    heartRate: v.optional(v.number()), // Detak jantung (bpm)
    respiratoryRate: v.optional(v.number()), // Laju pernapasan (per menit)
    bloodPressureSystolic: v.optional(v.number()), // Tekanan darah sistolik (mmHg)
    bloodPressureDiastolic: v.optional(v.number()), // Tekanan darah diastolik (mmHg)
    physicalExamination: v.optional(v.string()), // Hasil pemeriksaan fisik
    diagnosis: v.optional(v.string()), // Diagnosis penyakit
    treatmentPlan: v.optional(v.string()), // Rencana pengobatan

    // Financial
    subtotal: v.number(), // Sum of service subtotals
    discountAmount: v.number(),
    discountType: v.string(), // percent or nominal
    taxAmount: v.number(),
    taxRate: v.number(),
    totalAmount: v.number(),
    paidAmount: v.number(),
    outstandingAmount: v.number(),
    notes: v.optional(v.string()), // General notes
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_appointment_number", ["appointmentNumber"])
    .index("by_branch", ["branchId"])
    .index("by_pet", ["petId"])
    .index("by_customer", ["customerId"])
    .index("by_staff", ["staffId"])
    .index("by_status", ["status"])
    .index("by_appointment_date", ["appointmentDate"])
    .index("by_date_and_time", ["appointmentDate", "appointmentTime"]),

  // Clinic Appointment Services (Line Items)
  clinicAppointmentServices: defineTable({
    appointmentId: v.id("clinicAppointments"),
    serviceId: v.id("products"), // Now using products table (type="service")
    productId: v.optional(v.id("products")), // For prescriptions/inventory items
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.number(),
    discountType: v.string(),
    subtotal: v.number(),
    isPrescription: v.boolean(), // If true, stock reduced on pickup, not on completion
    prescriptionDosage: v.optional(v.string()), // e.g., "2x sehari, 5 hari"
    prescriptionPickedUp: v.optional(v.boolean()), // Track pickup status
    prescriptionPickupDate: v.optional(v.number()),
    notes: v.optional(v.string()), // Diagnosis, treatment notes
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_appointment", ["appointmentId"])
    .index("by_service", ["serviceId"])
    .index("by_product", ["productId"]),

  // Clinic Payments
  clinicPayments: defineTable({
    appointmentId: v.id("clinicAppointments"),
    amount: v.number(),
    paymentMethod: v.string(), // CASH, QRIS, CREDIT, BANK_TRANSFER, DEBIT_CARD
    referenceNumber: v.optional(v.string()),
    paymentDate: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_appointment", ["appointmentId"])
    .index("by_payment_method", ["paymentMethod"])
    .index("by_payment_date", ["paymentDate"]),

  // Clinic Service Packages
  clinicServicePackages: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    packageServices: v.array(
      v.object({
        serviceId: v.id("clinicServices"),
        quantity: v.number(),
      })
    ),
    packagePrice: v.number(), // Discounted price vs individual services
    validityDays: v.number(), // Package valid for X days after purchase
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_name", ["name"]),

  // Clinic Package Subscriptions (Customer purchases)
  clinicPackageSubscriptions: defineTable({
    customerId: v.id("customers"),
    packageId: v.id("clinicServicePackages"),
    purchaseDate: v.number(),
    expiresAt: v.number(),
    remainingServices: v.array(
      v.object({
        serviceId: v.id("clinicServices"),
        remainingQuantity: v.number(),
      })
    ),
    usageHistory: v.array(
      v.object({
        appointmentId: v.id("clinicAppointments"),
        serviceId: v.id("clinicServices"),
        usedQuantity: v.number(),
        usedDate: v.number(),
        branchId: v.id("branches"),
      })
    ),
    status: v.string(), // Active, Expired, FullyUsed
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_package", ["packageId"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"]),

  // ==================== PET HOTEL / BOARDING ====================

  // Hotel Rooms/Cages Inventory
  hotelRooms: defineTable({
    code: v.string(), // ROOM-A1, CAGE-C01
    name: v.string(), // "Room A1 - Large Dog", "Cage C01 - Small Cat"
    branchId: v.id("branches"),
    roomType: v.string(), // "Cage", "Room", "Suite"
    animalCategory: v.string(), // "Anjing", "Kucing", "Burung", etc.
    size: v.string(), // "Small", "Medium", "Large"
    dailyRate: v.number(), // Base price per day
    capacity: v.number(), // Max pets (1 for standard, 2+ for suite)
    amenities: v.array(v.string()), // ["AC", "CCTV", "Outdoor Access"]
    description: v.optional(v.string()),
    status: v.string(), // "Available", "Occupied", "Reserved", "Maintenance"
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_branch", ["branchId"])
    .index("by_room_type", ["roomType"])
    .index("by_status", ["status"])
    .index("by_animal_category", ["animalCategory"]),

  // Hotel Bookings (Transaction Header)
  hotelBookings: defineTable({
    bookingNumber: v.string(), // HTL-YYYYMMDD-001
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    petId: v.id("customerPets"),
    roomId: v.id("hotelRooms"),

    // Dates
    checkInDate: v.number(), // Planned check-in date (timestamp)
    checkOutDate: v.number(), // Planned check-out date (timestamp)
    actualCheckInDate: v.optional(v.number()), // Actual check-in timestamp
    actualCheckOutDate: v.optional(v.number()), // Actual check-out timestamp

    // Status
    status: v.string(), // "Reserved", "CheckedIn", "CheckedOut", "Cancelled"

    // Pricing
    numberOfDays: v.number(), // Calculated: ceil((checkOut - checkIn) / day)
    dailyRate: v.number(), // Rate at booking time (for price lock)
    roomTotal: v.number(), // numberOfDays × dailyRate
    servicesTotal: v.number(), // Sum of additional services
    consumablesTotal: v.number(), // Sum of food/supplies
    subtotal: v.number(), // roomTotal + servicesTotal + consumablesTotal
    discountAmount: v.number(), // Transaction-level discount
    discountType: v.string(), // "percent" or "nominal"
    taxAmount: v.number(), // Tax amount
    taxRate: v.number(), // Tax rate percentage
    totalAmount: v.number(), // Final amount after discount and tax
    paidAmount: v.number(), // Sum of payments (deposit + partial + final)
    outstandingAmount: v.number(), // Remaining balance

    // Additional info
    specialRequests: v.optional(v.string()), // "Alergi makanan ayam", etc.
    emergencyContact: v.optional(v.string()), // Emergency phone number
    ownFood: v.boolean(), // Customer brings own food (no charges)
    notes: v.optional(v.string()),

    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_booking_number", ["bookingNumber"])
    .index("by_branch", ["branchId"])
    .index("by_customer", ["customerId"])
    .index("by_pet", ["petId"])
    .index("by_room", ["roomId"])
    .index("by_status", ["status"])
    .index("by_check_in_date", ["checkInDate"])
    .index("by_check_out_date", ["checkOutDate"]),

  // Hotel Booking Services (Per-booking services like grooming, vet checkup)
  hotelBookingServices: defineTable({
    bookingId: v.id("hotelBookings"),
    serviceId: v.id("products"), // From products (type="service")
    serviceDate: v.number(), // When service was/will be performed
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.number(),
    discountType: v.string(), // "percent" or "nominal"
    subtotal: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_service", ["serviceId"])
    .index("by_service_date", ["serviceDate"]),

  // Hotel Consumables (Daily food & supplies usage)
  hotelConsumables: defineTable({
    bookingId: v.id("hotelBookings"),
    productId: v.id("products"), // From products (type="product")
    variantId: v.optional(v.id("productVariants")),
    consumptionDate: v.number(), // Daily tracking
    quantity: v.number(), // e.g., 0.5 kg of dog food
    unitPrice: v.number(), // Stock unit price (from averageCost)
    subtotal: v.number(), // quantity × unitPrice
    notes: v.optional(v.string()), // "Makanan pagi", "Tambahan snack"
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_product", ["productId"])
    .index("by_consumption_date", ["consumptionDate"]),

  // Hotel Payments (Deposit, partial, final payment)
  hotelPayments: defineTable({
    bookingId: v.id("hotelBookings"),
    paymentType: v.string(), // "Deposit", "Partial", "FullPayment", "Refund"
    amount: v.number(),
    paymentMethod: v.string(), // CASH, QRIS, CREDIT, BANK_TRANSFER, DEBIT_CARD
    referenceNumber: v.optional(v.string()), // For QRIS/bank transfers
    paymentDate: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_payment_type", ["paymentType"])
    .index("by_payment_method", ["paymentMethod"])
    .index("by_payment_date", ["paymentDate"]),

  // ==================== SALES & TRANSACTIONS ====================

  // Sales (Transaction Header)
  sales: defineTable({
    saleNumber: v.string(), // INV-YYYYMMDD-001
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    saleDate: v.number(),
    status: v.string(), // Draft, Completed, Cancelled
    subtotal: v.number(), // Sum of item subtotals before transaction discount
    discountAmount: v.number(), // Transaction-level discount
    discountType: v.string(), // percent or nominal
    taxAmount: v.number(), // Tax amount applied
    taxRate: v.number(), // Tax rate percentage (e.g., 11 for PPN 11%)
    totalAmount: v.number(), // Final amount after discount and tax
    paidAmount: v.number(), // Sum of payments received
    outstandingAmount: v.number(), // Remaining balance (for credit)
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sale_number", ["saleNumber"])
    .index("by_branch", ["branchId"])
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"])
    .index("by_sale_date", ["saleDate"]),

  // Sale Items (Line Items)
  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(), // Price at time of sale
    discountAmount: v.number(), // Item-level discount
    discountType: v.string(), // percent or nominal
    subtotal: v.number(), // qty * price - discount
    cogs: v.number(), // Cost of goods sold (from avgCost)
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sale", ["saleId"])
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"]),

  // Sale Payments (Multiple payments per sale)
  salePayments: defineTable({
    saleId: v.id("sales"),
    amount: v.number(),
    paymentMethod: v.string(), // CASH, QRIS, CREDIT, BANK_TRANSFER, DEBIT_CARD
    referenceNumber: v.optional(v.string()), // For QRIS/bank transfers
    paymentDate: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sale", ["saleId"])
    .index("by_payment_method", ["paymentMethod"])
    .index("by_payment_date", ["paymentDate"]),

  // ==================== ACCOUNTING MODULE ====================

  // Chart of Accounts
  accounts: defineTable({
    accountCode: v.string(), // 1-101, 4-401-001 (hierarchical numbering)
    accountName: v.string(), // Kas Besar, Piutang Usaha, Penjualan Retail
    accountType: v.string(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    category: v.string(), // Current Asset, Fixed Asset, Operating Revenue, etc.
    parentAccountId: v.optional(v.id("accounts")), // For sub-accounts
    normalBalance: v.string(), // DEBIT or CREDIT
    description: v.optional(v.string()),
    isHeader: v.boolean(), // true = parent/group account (can't post transactions)
    isActive: v.boolean(),
    level: v.number(), // Hierarchy level (1=main, 2=sub, 3=detail)
    taxable: v.optional(v.boolean()), // For tax reporting
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_account_code", ["accountCode"])
    .index("by_account_type", ["accountType"])
    .index("by_parent", ["parentAccountId"])
    .index("by_category", ["category"]),

  // Journal Entries (Transaction Header)
  journalEntries: defineTable({
    journalNumber: v.string(), // JE-YYYYMMDD-001
    journalDate: v.number(), // Transaction date
    description: v.string(), // Transaction description
    sourceType: v.string(), // SALE, PURCHASE, EXPENSE, PAYMENT, CLINIC, HOTEL, MANUAL, ADJUSTMENT
    sourceId: v.optional(v.string()), // Reference ID (saleId, poId, etc.)
    status: v.string(), // Draft, Posted, Voided
    totalDebit: v.number(), // Must equal totalCredit
    totalCredit: v.number(),
    postedBy: v.optional(v.id("users")),
    postedAt: v.optional(v.number()),
    voidedBy: v.optional(v.id("users")),
    voidedAt: v.optional(v.number()),
    voidReason: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_journal_number", ["journalNumber"])
    .index("by_journal_date", ["journalDate"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_status", ["status"]),

  // Journal Entry Lines (Double-entry details)
  journalEntryLines: defineTable({
    journalEntryId: v.id("journalEntries"),
    accountId: v.id("accounts"),
    branchId: v.optional(v.id("branches")), // For branch-level reporting
    description: v.optional(v.string()), // Line-level description
    debitAmount: v.number(), // 0 if credit entry
    creditAmount: v.number(), // 0 if debit entry
    sortOrder: v.number(), // Display order in journal entry
  })
    .index("by_journal_entry", ["journalEntryId"])
    .index("by_account", ["accountId"])
    .index("by_branch", ["branchId"])
    .index("by_account_date", ["accountId", "journalEntryId"]), // For ledger queries

  // Bank Accounts
  bankAccounts: defineTable({
    accountName: v.string(), // BCA - Checking, Mandiri - Savings
    bankName: v.string(), // BCA, Mandiri, BRI, BNI
    accountNumber: v.string(),
    branchName: v.optional(v.string()), // Bank branch
    linkedAccountId: v.id("accounts"), // Link to CoA (e.g., 1-102-001 Bank BCA)
    initialBalance: v.number(), // Opening balance
    currentBalance: v.number(), // Real-time balance
    currency: v.string(), // IDR, USD (default IDR)
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_account_number", ["accountNumber"])
    .index("by_bank_name", ["bankName"])
    .index("by_linked_account", ["linkedAccountId"]),

  // Bank Transactions (with reconciliation)
  bankTransactions: defineTable({
    bankAccountId: v.id("bankAccounts"),
    transactionDate: v.number(),
    transactionType: v.string(), // DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT, FEE, INTEREST
    amount: v.number(),
    referenceNumber: v.optional(v.string()), // Check number, transfer ref, etc.
    description: v.string(),
    journalEntryId: v.optional(v.id("journalEntries")), // Link to auto-generated JE
    reconciliationStatus: v.string(), // UNRECONCILED, RECONCILED, VOID
    reconciledDate: v.optional(v.number()),
    reconciledBy: v.optional(v.id("users")),
    bankStatementDate: v.optional(v.number()), // Date from bank statement
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_bank_account", ["bankAccountId"])
    .index("by_transaction_date", ["transactionDate"])
    .index("by_reconciliation_status", ["reconciliationStatus"])
    .index("by_journal_entry", ["journalEntryId"]),

  // Expense Categories
  expenseCategories: defineTable({
    categoryName: v.string(), // Operational, Utilities, Marketing, Salary, Rent
    linkedAccountId: v.id("accounts"), // Link to CoA expense account
    requiresApproval: v.boolean(), // If true, needs manager approval
    approvalThreshold: v.optional(v.number()), // Auto-approve below this amount
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_category_name", ["categoryName"]),

  // Expenses (with approval workflow)
  expenses: defineTable({
    expenseNumber: v.string(), // EXP-YYYYMMDD-001
    branchId: v.id("branches"),
    categoryId: v.id("expenseCategories"),
    expenseDate: v.number(),
    amount: v.number(),
    vendor: v.optional(v.string()), // Vendor/supplier name
    description: v.string(),
    receiptAttachmentId: v.optional(v.string()), // Convex storage ID
    status: v.string(), // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID
    paymentMethod: v.optional(v.string()), // CASH, BANK, CHECK
    paymentDate: v.optional(v.number()),
    checkNumber: v.optional(v.string()), // For check payments

    // Approval workflow
    submittedBy: v.optional(v.id("users")),
    submittedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),

    journalEntryId: v.optional(v.id("journalEntries")), // Link to auto-generated JE
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_expense_number", ["expenseNumber"])
    .index("by_branch", ["branchId"])
    .index("by_category", ["categoryId"])
    .index("by_status", ["status"])
    .index("by_expense_date", ["expenseDate"])
    .index("by_submitted_by", ["submittedBy"]),

  // Recurring Expenses (monthly rent, utilities)
  recurringExpenses: defineTable({
    name: v.string(), // Monthly Rent, Electricity Bill
    categoryId: v.id("expenseCategories"),
    branchId: v.optional(v.id("branches")), // null = all branches
    amount: v.number(),
    frequency: v.string(), // MONTHLY, QUARTERLY, YEARLY
    startDate: v.number(),
    endDate: v.optional(v.number()), // null = indefinite
    nextDueDate: v.number(),
    lastGeneratedDate: v.optional(v.number()),
    autoGenerate: v.boolean(), // Auto-create expense on due date
    vendor: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_category", ["categoryId"])
    .index("by_next_due_date", ["nextDueDate"])
    .index("by_branch", ["branchId"]),

  // Accounting Periods (for closing & audit)
  accountingPeriods: defineTable({
    year: v.number(), // 2025
    month: v.number(), // 1-12
    periodName: v.string(), // January 2025, Q1 2025
    startDate: v.number(),
    endDate: v.number(),
    status: v.string(), // OPEN, CLOSED, LOCKED
    closedBy: v.optional(v.id("users")),
    closedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_year_month", ["year", "month"])
    .index("by_status", ["status"])
    .index("by_start_date", ["startDate"]),

  // Period Balances (snapshot for audit trail)
  periodBalances: defineTable({
    periodId: v.id("accountingPeriods"),
    accountId: v.id("accounts"),
    branchId: v.optional(v.id("branches")), // null = consolidated
    openingBalance: v.number(), // Debit positive, credit negative
    debitTotal: v.number(), // Total debits in period
    creditTotal: v.number(), // Total credits in period
    closingBalance: v.number(), // Opening + debits - credits
    createdAt: v.number(),
  })
    .index("by_period", ["periodId"])
    .index("by_account", ["accountId"])
    .index("by_period_account", ["periodId", "accountId"])
    .index("by_branch", ["branchId"]),

  // Tax Accounts (for VAT tracking)
  taxAccounts: defineTable({
    taxCode: v.string(), // VAT_INPUT, VAT_OUTPUT, WHT_23
    taxName: v.string(), // PPN Masukan, PPN Keluaran
    taxRate: v.number(), // 11 (for 11%)
    linkedAccountId: v.id("accounts"), // Link to CoA
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_tax_code", ["taxCode"])
    .index("by_linked_account", ["linkedAccountId"]),

  // Legacy table - keep for backward compatibility
  numbers: defineTable({
    value: v.number(),
  }),
});

