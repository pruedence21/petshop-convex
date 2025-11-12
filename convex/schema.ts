import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // ==================== ROLE & PERMISSION ====================
  roles: defineTable({
    name: v.string(), // Admin, Manager, Staff, Kasir
    description: v.optional(v.string()),
    permissions: v.array(v.string()), // ["users.create", "users.read", "products.update", etc]
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
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
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sku", ["sku"])
    .index("by_name", ["name"])
    .index("by_category", ["categoryId"])
    .index("by_brand", ["brandId"]),

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
    movementType: v.string(), // PURCHASE_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT, SALE_OUT, TRANSFER_IN, TRANSFER_OUT, RETURN_IN, DAMAGE_OUT
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

  // Legacy table - keep for backward compatibility
  numbers: defineTable({
    value: v.number(),
  }),
});

