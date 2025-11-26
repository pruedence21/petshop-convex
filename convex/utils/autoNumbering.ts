/**
 * Centralized auto-numbering utility for all transaction types
 * Generates sequential numbers in format: PREFIX-YYYYMMDD-NNN
 * Also handles uniqueness validation when custom numbers are provided
 */

import { QueryCtx, MutationCtx } from "../_generated/server";

type NumberableTable = 
  | "sales"
  | "purchaseOrders"
  | "clinicAppointments"
  | "hotelBookings"
  | "expenses"
  | "journalEntries";

type NumberFieldMap = {
  sales: "saleNumber";
  purchaseOrders: "poNumber";
  clinicAppointments: "appointmentNumber";
  hotelBookings: "bookingNumber";
  expenses: "expenseNumber";
  journalEntries: "journalNumber";
};

type IndexMap = {
  sales: "by_sale_number";
  purchaseOrders: "by_po_number";
  clinicAppointments: "by_appointment_number";
  hotelBookings: "by_booking_number";
  expenses: "by_expense_number";
  journalEntries: "by_journal_number";
};

const PREFIXES: Record<NumberableTable, string> = {
  sales: "INV",
  purchaseOrders: "PO",
  clinicAppointments: "APT",
  hotelBookings: "HTL",
  expenses: "EXP",
  journalEntries: "JE",
};

const NUMBER_FIELDS: NumberFieldMap = {
  sales: "saleNumber",
  purchaseOrders: "poNumber",
  clinicAppointments: "appointmentNumber",
  hotelBookings: "bookingNumber",
  expenses: "expenseNumber",
  journalEntries: "journalNumber",
};

const INDEXES: IndexMap = {
  sales: "by_sale_number",
  purchaseOrders: "by_po_number",
  clinicAppointments: "by_appointment_number",
  hotelBookings: "by_booking_number",
  expenses: "by_expense_number",
  journalEntries: "by_journal_number",
};

/**
 * Generate next available transaction number
 * Format: PREFIX-YYYYMMDD-001
 * 
 * Note: This function queries all records with the given index and filters in memory.
 * For large datasets, consider adding date-based composite indexes for better performance.
 */
export async function generateTransactionNumber(
  ctx: QueryCtx | MutationCtx,
  table: NumberableTable,
  date?: Date
): Promise<string> {
  const now = date || new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `${PREFIXES[table]}-${dateStr}-`;
  const numberField = NUMBER_FIELDS[table];
  const indexName = INDEXES[table];

  // Query all records with the index
  // Note: Using 'as any' here because Convex's type system doesn't support dynamic index names
  // This is safe as we validate index names via the IndexMap type
  const records = await ctx.db
    .query(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex(indexName as any)
    .collect();

  // Filter to today's records in memory
  // For better performance with large datasets, consider adding a date-based index
  const todayRecords = records.filter((record) =>
    (record as Record<string, string>)[numberField].startsWith(prefix)
  );

  if (todayRecords.length === 0) {
    return `${prefix}001`;
  }

  // Get max number
  const maxNumber = Math.max(
    ...todayRecords.map((record) => {
      const numPart = (record as Record<string, string>)[numberField].split("-")[2];
      return parseInt(numPart, 10);
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

/**
 * Validate that a custom transaction number is unique
 * Throws error if number already exists
 * 
 * Note: This queries all records and filters in memory for validation.
 * This is acceptable for uniqueness checks as they happen infrequently.
 */
export async function validateUniqueTransactionNumber(
  ctx: QueryCtx | MutationCtx,
  table: NumberableTable,
  transactionNumber: string
): Promise<void> {
  const numberField = NUMBER_FIELDS[table];
  const indexName = INDEXES[table];

  // Query using the index for the specific number
  // Note: We query all records and filter in memory because Convex indexes
  // don't support direct equality filtering on string fields in the type-safe API
  const records = await ctx.db
    .query(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex(indexName as any)
    .collect();

  const existing = records.find((record) =>
    (record as Record<string, string>)[numberField] === transactionNumber
  );

  if (existing) {
    throw new Error(
      `Transaction number ${transactionNumber} already exists for ${table}`
    );
  }
}

/**
 * Get or generate transaction number
 * If customNumber is provided, validates uniqueness and returns it
 * Otherwise, generates next available number
 */
export async function getOrGenerateTransactionNumber(
  ctx: QueryCtx | MutationCtx,
  table: NumberableTable,
  customNumber?: string,
  date?: Date
): Promise<string> {
  if (customNumber) {
    // Validate custom number is unique
    await validateUniqueTransactionNumber(ctx, table, customNumber);
    return customNumber;
  }

  // Generate next available number
  return await generateTransactionNumber(ctx, table, date);
}

/**
 * Generate auto SKU for products
 * Format: CATEGORY-BRAND-NNN
 * 
 * Note: This queries all products and filters by prefix in memory.
 * For large product catalogs, consider adding a composite index on (categoryCode, brandCode)
 * or using a separate counter table for each category-brand combination.
 */
export async function generateProductSKU(
  ctx: QueryCtx | MutationCtx,
  categoryCode: string,
  brandCode: string
): Promise<string> {
  const prefix = `${categoryCode}-${brandCode}-`;

  // Get all products to find max number for this prefix
  // For better performance with large catalogs, consider using a counter table
  // or composite index on (categoryCode, brandCode)
  const products = await ctx.db
    .query("products")
    .withIndex("by_sku")
    .collect();

  const matchingProducts = products.filter((p) => p.sku.startsWith(prefix));

  if (matchingProducts.length === 0) {
    return `${prefix}001`;
  }

  // Get max number
  const maxNumber = Math.max(
    ...matchingProducts.map((p) => {
      const parts = p.sku.split("-");
      const numPart = parts[parts.length - 1];
      return parseInt(numPart, 10) || 0;
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

/**
 * Validate that a custom SKU is unique
 */
export async function validateUniqueSKU(
  ctx: QueryCtx | MutationCtx,
  sku: string,
  excludeProductId?: string
): Promise<void> {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_sku", (q) => q.eq("sku", sku))
    .unique();

  if (existing && existing._id.toString() !== excludeProductId) {
    throw new Error(`SKU ${sku} already exists`);
  }
}

/**
 * Get or generate product SKU
 * If customSKU is provided, validates uniqueness and returns it
 * Otherwise, generates next available SKU based on category and brand
 */
export async function getOrGenerateProductSKU(
  ctx: QueryCtx | MutationCtx,
  customSKU: string | undefined,
  categoryCode: string,
  brandCode: string,
  excludeProductId?: string
): Promise<string> {
  if (customSKU) {
    // Validate custom SKU is unique
    await validateUniqueSKU(ctx, customSKU, excludeProductId);
    return customSKU;
  }

  // Generate next available SKU
  return await generateProductSKU(ctx, categoryCode, brandCode);
}
