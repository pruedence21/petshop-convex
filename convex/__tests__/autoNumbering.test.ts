import { describe, expect, it, beforeEach } from "vitest";
import { MockDatabase, createMockMutationContext } from "./helpers/mockContext";
import { mockId } from "./helpers/testData";
import { 
  generateTransactionNumber,
  validateUniqueTransactionNumber,
  getOrGenerateTransactionNumber,
  generateProductSKU,
  validateUniqueSKU,
  getOrGenerateProductSKU
} from "../utils/autoNumbering";

describe("Auto-Numbering System", () => {
  let db: MockDatabase;
  let ctx: any;

  beforeEach(() => {
    db = new MockDatabase();
    ctx = createMockMutationContext(db);
  });
  describe("Transaction Number Generation", () => {
    it("should generate first transaction number for sales", async () => {
      const result = await generateTransactionNumber(ctx, "sales");
      
      expect(result).toMatch(/^INV-\d{8}-001$/);
    });

    it("should generate sequential transaction numbers", async () => {
      // Insert first sale
      await db.insert("sales", {
        saleNumber: "INV-20251126-001",
        branchId: mockId("branches"),
        customerId: mockId("customers"),
        saleDate: Date.now(),
        status: "Draft",
        subtotal: 0,
        discountAmount: 0,
        discountType: "nominal",
        taxAmount: 0,
        taxRate: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
      });

      const date = new Date(2025, 10, 26); // Nov 26, 2025
      const result = await generateTransactionNumber(ctx, "sales", date);
      
      expect(result).toBe("INV-20251126-002");
    });

    it("should validate unique transaction numbers", async () => {
      // Insert existing sale
      await db.insert("sales", {
        saleNumber: "INV-20251126-001",
        branchId: mockId("branches"),
        customerId: mockId("customers"),
        saleDate: Date.now(),
        status: "Draft",
        subtotal: 0,
        discountAmount: 0,
        discountType: "nominal",
        taxAmount: 0,
        taxRate: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
      });

      await expect(
        validateUniqueTransactionNumber(ctx, "sales", "INV-20251126-001")
      ).rejects.toThrow(/already exists/);
    });

    it("should accept unique custom transaction numbers", async () => {
      await expect(
        validateUniqueTransactionNumber(ctx, "sales", "INV-20251126-999")
      ).resolves.not.toThrow();
    });

    it("should use custom number when provided", async () => {
      const customNumber = "INV-20251126-555";
      const result = await getOrGenerateTransactionNumber(
        ctx,
        "sales",
        customNumber
      );
      
      expect(result).toBe(customNumber);
    });

    it("should auto-generate when custom number not provided", async () => {
      const result = await getOrGenerateTransactionNumber(ctx, "sales");
      
      expect(result).toMatch(/^INV-\d{8}-001$/);
    });
  });

  describe("Purchase Order Numbers", () => {
    it("should generate first PO number", async () => {
      const result = await generateTransactionNumber(ctx, "purchaseOrders");
      
      expect(result).toMatch(/^PO-\d{8}-001$/);
    });

    it("should generate sequential PO numbers", async () => {
      await db.insert("purchaseOrders", {
        poNumber: "PO-20251126-001",
        supplierId: mockId("suppliers"),
        branchId: mockId("branches"),
        orderDate: Date.now(),
        status: "Draft",
        totalAmount: 0,
      });

      const date = new Date(2025, 10, 26);
      const result = await generateTransactionNumber(ctx, "purchaseOrders", date);
      
      expect(result).toBe("PO-20251126-002");
    });
  });

  describe("Expense Numbers", () => {
    it("should generate first expense number", async () => {
      const result = await generateTransactionNumber(ctx, "expenses");
      
      expect(result).toMatch(/^EXP-\d{8}-001$/);
    });

    it("should generate sequential expense numbers", async () => {
      await db.insert("expenses", {
        expenseNumber: "EXP-20251126-001",
        branchId: mockId("branches"),
        categoryId: mockId("expenseCategories"),
        expenseDate: Date.now(),
        amount: 100000,
        description: "Test expense",
        status: "DRAFT",
      });

      const date = new Date(2025, 10, 26);
      const result = await generateTransactionNumber(ctx, "expenses", date);
      
      expect(result).toBe("EXP-20251126-002");
    });
  });

  describe("Product SKU Auto-Generation", () => {
    it("should generate first SKU for category-brand combination", async () => {
      const result = await generateProductSKU(ctx, "DOG", "ROYAL");
      
      expect(result).toBe("DOG-ROYAL-001");
    });

    it("should generate sequential SKUs for same category-brand", async () => {
      await db.insert("products", {
        sku: "DOG-ROYAL-001",
        name: "Dog Food Large Breed",
        categoryId: mockId("productCategories"),
        brandId: mockId("brands"),
        unitId: mockId("units"),
        purchasePrice: 100000,
        sellingPrice: 150000,
        minStock: 10,
        maxStock: 100,
        hasVariants: false,
        type: "product",
        isActive: true,
      });

      const result = await generateProductSKU(ctx, "DOG", "ROYAL");
      
      expect(result).toBe("DOG-ROYAL-002");
    });

    it("should validate unique SKUs", async () => {
      await db.insert("products", {
        sku: "DOG-ROYAL-001",
        name: "Dog Food Large Breed",
        categoryId: mockId("productCategories"),
        brandId: mockId("brands"),
        unitId: mockId("units"),
        purchasePrice: 100000,
        sellingPrice: 150000,
        minStock: 10,
        maxStock: 100,
        hasVariants: false,
        type: "product",
        isActive: true,
      });

      await expect(
        validateUniqueSKU(ctx, "DOG-ROYAL-001")
      ).rejects.toThrow(/already exists/);
    });

    it("should accept unique custom SKUs", async () => {
      await expect(
        validateUniqueSKU(ctx, "CUSTOM-SKU-999")
      ).resolves.not.toThrow();
    });

    it("should use custom SKU when provided", async () => {
      const customSKU = "CUSTOM-SKU-999";
      const result = await getOrGenerateProductSKU(
        ctx,
        customSKU,
        "DOG",
        "ROYAL"
      );
      
      expect(result).toBe(customSKU);
    });

    it("should auto-generate SKU when not provided", async () => {
      const result = await getOrGenerateProductSKU(
        ctx,
        undefined,
        "DOG",
        "ROYAL"
      );
      
      expect(result).toBe("DOG-ROYAL-001");
    });
  });
});
