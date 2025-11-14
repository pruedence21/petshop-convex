import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { reduceStockForSaleHelper } from "./productStock";
import { createSaleJournalEntry } from "./accountingHelpers";
import { calculateLine, calculateTotals, LineItemInput } from "../lib/finance";
import { buildError } from "../lib/errors";

// Generate Sale Number (INV-YYYYMMDD-001)
async function generateSaleNumber(ctx: any): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `INV-${dateStr}-`;

  // Find last sale of today
  const todaySales = await ctx.db
    .query("sales")
    .withIndex("by_sale_number")
    .collect();

  const todayFiltered = todaySales.filter((sale: any) =>
    sale.saleNumber.startsWith(prefix)
  );

  if (todayFiltered.length === 0) {
    return `${prefix}001`;
  }

  // Get max number
  const maxNumber = Math.max(
    ...todayFiltered.map((sale: any) => {
      const numPart = sale.saleNumber.split("-")[2];
      return parseInt(numPart, 10);
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

// Use centralized finance calculation from lib/finance.ts
// calculateLine and calculateTotals handle all discount/tax logic

// Create sale (Draft status)
export const create = mutation({
  args: {
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    saleDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const saleNumber = await generateSaleNumber(ctx);

    const saleId = await ctx.db.insert("sales", {
      saleNumber,
      branchId: args.branchId,
      customerId: args.customerId,
      saleDate: args.saleDate,
      status: "Draft",
      subtotal: 0,
      discountAmount: 0,
      discountType: "nominal",
      taxAmount: 0,
      taxRate: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    return { saleId, saleNumber };
  },
});

// Add item to sale
export const addItem = mutation({
  args: {
    saleId: v.id("sales"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) {
      throw new Error(JSON.stringify(buildError({ code: "NOT_FOUND", message: "Sale not found" })));
    }
    if (sale.status !== "Draft") {
      throw new Error(JSON.stringify(buildError({ code: "STATUS_CONFLICT", message: "Can only add items to draft sale", details: { currentStatus: sale.status } })));
    }

    const discountAmount = args.discountAmount || 0;
    const discountType = args.discountType || "nominal";
    
    const lineCalc = calculateLine({
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount: discountType === "nominal" ? discountAmount : 0,
      discountPercent: discountType === "percent" ? discountAmount : 0,
      taxPercent: 0, // Tax applied at transaction level, not line level
    });
    const subtotal = lineCalc.netBeforeTax;

    const itemId = await ctx.db.insert("saleItems", {
      saleId: args.saleId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount,
      discountType,
      subtotal,
      cogs: 0, // Will be set when sale is completed
      createdBy: undefined,
    });

    // Recalculate sale subtotal
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.saleId))
      .collect();

    // Recalculate totals using centralized finance logic
    const itemInputs: LineItemInput[] = items.map(it => ({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmount: it.discountType === "nominal" ? it.discountAmount : 0,
      discountPercent: it.discountType === "percent" ? it.discountAmount : 0,
    }));
    const totals = calculateTotals(itemInputs);
    const newSubtotal = totals.totalGross - totals.totalDiscount;
    
    // Apply transaction-level discount and tax
    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: newSubtotal,
      discountAmount: sale.discountType === "nominal" ? sale.discountAmount : 0,
      discountPercent: sale.discountType === "percent" ? sale.discountAmount : 0,
      taxPercent: sale.taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;

    await ctx.db.patch(args.saleId, {
      subtotal: newSubtotal,
      taxAmount,
      totalAmount,
      outstandingAmount: totalAmount - sale.paidAmount,
      updatedBy: undefined,
    });

    return itemId;
  },
});

// Update item in sale
export const updateItem = mutation({
  args: {
    itemId: v.id("saleItems"),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const sale = await ctx.db.get(item.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "Draft") throw new Error("Can only update items in draft sale");

    const quantity = args.quantity ?? item.quantity;
    const unitPrice = args.unitPrice ?? item.unitPrice;
    const discountAmount = args.discountAmount ?? item.discountAmount;
    const discountType = args.discountType ?? item.discountType;
    
    const lineCalc = calculateLine({
      quantity,
      unitPrice,
      discountAmount: discountType === "nominal" ? discountAmount : 0,
      discountPercent: discountType === "percent" ? discountAmount : 0,
      taxPercent: 0,
    });
    const subtotal = lineCalc.netBeforeTax;

    await ctx.db.patch(args.itemId, {
      quantity,
      unitPrice,
      discountAmount,
      discountType,
      subtotal,
      updatedBy: undefined,
    });

    // Recalculate sale subtotal
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", item.saleId))
      .collect();

    const itemInputs: LineItemInput[] = items.map(it => ({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmount: it.discountType === "nominal" ? it.discountAmount : 0,
      discountPercent: it.discountType === "percent" ? it.discountAmount : 0,
    }));
    const totals = calculateTotals(itemInputs);
    const newSubtotal = totals.totalGross - totals.totalDiscount;

    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: newSubtotal,
      discountAmount: sale.discountType === "nominal" ? sale.discountAmount : 0,
      discountPercent: sale.discountType === "percent" ? sale.discountAmount : 0,
      taxPercent: sale.taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;

    await ctx.db.patch(item.saleId, {
      subtotal: newSubtotal,
      taxAmount,
      totalAmount,
      outstandingAmount: totalAmount - sale.paidAmount,
      updatedBy: undefined,
    });

    return args.itemId;
  },
});

// Remove item from sale
export const removeItem = mutation({
  args: {
    itemId: v.id("saleItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const sale = await ctx.db.get(item.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "Draft") throw new Error("Can only remove items from draft sale");

    await ctx.db.delete(args.itemId);

    // Recalculate sale subtotal
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", item.saleId))
      .collect();

    const itemInputs: LineItemInput[] = items.map(it => ({
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmount: it.discountType === "nominal" ? it.discountAmount : 0,
      discountPercent: it.discountType === "percent" ? it.discountAmount : 0,
    }));
    const totals = calculateTotals(itemInputs);
    const newSubtotal = totals.totalGross - totals.totalDiscount;

    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: newSubtotal,
      discountAmount: sale.discountType === "nominal" ? sale.discountAmount : 0,
      discountPercent: sale.discountType === "percent" ? sale.discountAmount : 0,
      taxPercent: sale.taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;

    await ctx.db.patch(item.saleId, {
      subtotal: newSubtotal,
      taxAmount,
      totalAmount,
      outstandingAmount: totalAmount - sale.paidAmount,
      updatedBy: undefined,
    });

    return item.saleId;
  },
});

// Update transaction-level discount and tax
export const updateDiscountAndTax = mutation({
  args: {
    saleId: v.id("sales"),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    taxRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "Draft") throw new Error("Can only update draft sale");

    const discountAmount = args.discountAmount ?? sale.discountAmount;
    const discountType = args.discountType ?? sale.discountType;
    const taxRate = args.taxRate ?? sale.taxRate;

    // Recalculate total using finance.ts
    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: sale.subtotal,
      discountAmount: discountType === "nominal" ? discountAmount : 0,
      discountPercent: discountType === "percent" ? discountAmount : 0,
      taxPercent: taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;

    await ctx.db.patch(args.saleId, {
      discountAmount,
      discountType,
      taxRate,
      taxAmount,
      totalAmount,
      outstandingAmount: totalAmount - sale.paidAmount,
      updatedBy: undefined,
    });

    return args.saleId;
  },
});

// List sales with filters
export const list = query({
  args: {
    status: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    let sales;

    if (args.status) {
      sales = await ctx.db
        .query("sales")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.branchId) {
      sales = await ctx.db
        .query("sales")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .order("desc")
        .collect();
    } else if (args.customerId) {
      sales = await ctx.db
        .query("sales")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .order("desc")
        .collect();
    } else {
      sales = await ctx.db
        .query("sales")
        .withIndex("by_sale_date")
        .order("desc")
        .collect();
    }

    // Filter out deleted
    const filtered = sales.filter((sale) => !sale.deletedAt);

    // Enrich with customer and branch details
    const enriched = await Promise.all(
      filtered.map(async (sale) => {
        const customer = await ctx.db.get(sale.customerId);
        const branch = await ctx.db.get(sale.branchId);
        
        // Count items
        const items = await ctx.db
          .query("saleItems")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
          .collect();

        return {
          ...sale,
          customer,
          branch,
          itemCount: items.length,
        };
      })
    );

    return enriched;
  },
});

// Get sale by ID with items and payments
export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id);
    if (!sale || sale.deletedAt) return null;

    const customer = await ctx.db.get(sale.customerId);
    const branch = await ctx.db.get(sale.branchId);

    // Get items with product details
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .collect();

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        let variant = null;
        if (item.variantId) {
          variant = await ctx.db.get(item.variantId);
        }

        return {
          ...item,
          product,
          variant,
        };
      })
    );

    // Get payments
    const payments = await ctx.db
      .query("salePayments")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .collect();

    return {
      ...sale,
      customer,
      branch,
      items: enrichedItems,
      payments: payments.filter(p => !p.deletedAt),
    };
  },
});

// Cancel sale
export const cancel = mutation({
  args: {
    saleId: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.status === "Completed") {
      throw new Error("Cannot cancel completed sale - use return/refund process");
    }

    await ctx.db.patch(args.saleId, {
      status: "Cancelled",
      updatedBy: undefined,
    });

    return args.saleId;
  },
});

// Submit sale (Draft → Completed with stock reduction)
export const submitSale = mutation({
  args: {
    saleId: v.id("sales"),
    payments: v.array(
      v.object({
        amount: v.number(),
        paymentMethod: v.string(),
        referenceNumber: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) {
      throw new Error(JSON.stringify(buildError({ code: "NOT_FOUND", message: "Sale not found" })));
    }
    if (sale.status !== "Draft") {
      throw new Error(JSON.stringify(buildError({ code: "STATUS_CONFLICT", message: "Can only submit draft sale", details: { currentStatus: sale.status } })));
    }

    // Validate customer exists
    const customer = await ctx.db.get(sale.customerId);
    if (!customer) throw new Error("Customer not found");

    // Get sale items
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.saleId))
      .collect();

    if (items.length === 0) {
      throw new Error(JSON.stringify(buildError({ code: "NO_ITEMS", message: "Cannot submit sale without items" })));
    }

    // Validate payments
    const totalPayments = args.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Allow partial payment (credit) or full payment
    if (totalPayments > sale.totalAmount) {
      // Only allow overpayment for CASH (will calculate change)
      const hasCash = args.payments.some(p => p.paymentMethod === "CASH");
      if (!hasCash) {
        throw new Error(JSON.stringify(buildError({ code: "PAYMENT_EXCEEDS_TOTAL", message: "Total payments cannot exceed sale total", details: { totalPayments, totalAmount: sale.totalAmount } })));
      }
    }

    // Check stock availability and reduce stock for each item
    for (const item of items) {
      try {
        // Reduce stock and capture COGS
        const { cogs, avgCost } = await reduceStockForSaleHelper(ctx, {
          branchId: sale.branchId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          saleId: args.saleId,
        });

        // Update item with COGS
        await ctx.db.patch(item._id, {
          cogs,
          updatedBy: undefined,
        });
      } catch (error: any) {
        // If stock reduction fails, throw error with product info
        const product = await ctx.db.get(item.productId);
        const productName = product?.name || "Unknown product";
        
        let variantInfo = "";
        if (item.variantId) {
          const variant = await ctx.db.get(item.variantId);
          variantInfo = variant ? ` (${variant.variantValue})` : "";
        }
        
        throw new Error(`${productName}${variantInfo}: ${error.message}`);
      }
    }

    // Add payments
    const now = Date.now();
    let actualPaidAmount = 0;

    for (const payment of args.payments) {
      // For cash, cap at remaining amount (change handled in frontend)
      const paymentAmount = payment.paymentMethod === "CASH" 
        ? Math.min(payment.amount, sale.totalAmount - actualPaidAmount)
        : payment.amount;

      if (paymentAmount > 0) {
        await ctx.db.insert("salePayments", {
          saleId: args.saleId,
          amount: paymentAmount,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          paymentDate: now,
          notes: payment.notes,
          createdBy: undefined,
        });

        actualPaidAmount += paymentAmount;
      }
    }

    // Update sale status to Completed
    const outstandingAmount = sale.totalAmount - actualPaidAmount;

    await ctx.db.patch(args.saleId, {
      status: "Completed",
      paidAmount: actualPaidAmount,
      outstandingAmount,
      updatedBy: undefined,
    });

    // Create journal entry for accounting integration
    try {
      // Prepare items data with product details
      const itemsData = await Promise.all(
        items.map(async (item) => {
          const product = await ctx.db.get(item.productId);
          
          // Get category name
          let categoryName = "Pet Food"; // Default
          if (product?.categoryId) {
            const category = await ctx.db.get(product.categoryId);
            categoryName = category?.name || "Pet Food";
          }
          
          return {
            productName: product?.name || "Unknown Product",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            cogs: item.cogs,
            subtotal: item.subtotal,
            category: categoryName,
          };
        })
      );

      await createSaleJournalEntry(ctx, {
        saleId: args.saleId,
        saleNumber: sale.saleNumber,
        saleDate: sale.saleDate,
        branchId: sale.branchId,
        totalAmount: sale.totalAmount,
        paidAmount: actualPaidAmount,
        outstandingAmount,
        items: itemsData,
        discountAmount: sale.discountAmount,
        taxAmount: sale.taxAmount,
      });
    } catch (error: any) {
      // Log error but don't fail the sale
      console.error("Failed to create journal entry:", error.message);
    }

    return {
      saleId: args.saleId,
      status: "Completed",
      totalAmount: sale.totalAmount,
      paidAmount: actualPaidAmount,
      outstandingAmount,
      change: totalPayments > sale.totalAmount ? totalPayments - sale.totalAmount : 0,
    };
  },
});

// Delete sale (soft delete, only draft or cancelled)
export const remove = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id);
    if (!sale) throw new Error("Sale not found");
    if (sale.status !== "Draft" && sale.status !== "Cancelled") {
      throw new Error("Can only delete draft or cancelled sale");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return args.id;
  },
});

// Get outstanding sales by customer (for credit tracking)
export const getOutstandingByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("status"), "Completed"))
      .collect();

    const outstanding = sales.filter(
      (sale) => !sale.deletedAt && sale.outstandingAmount > 0
    );

    const enriched = await Promise.all(
      outstanding.map(async (sale) => {
        const branch = await ctx.db.get(sale.branchId);
        return {
          ...sale,
          branch,
        };
      })
    );

    return enriched;
  },
});
