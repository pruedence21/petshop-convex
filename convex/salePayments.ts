import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add payment to sale
export const addPayment = mutation({
  args: {
    saleId: v.id("sales"),
    amount: v.number(),
    paymentMethod: v.string(), // CASH, QRIS, CREDIT, BANK_TRANSFER, DEBIT_CARD
    referenceNumber: v.optional(v.string()),
    paymentDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found");

    // Validate payment amount
    if (args.amount <= 0) {
      throw new Error("Payment amount must be positive");
    }

    const currentPaid = sale.paidAmount || 0;
    const newPaidAmount = currentPaid + args.amount;

    // Allow overpayment for cash (will calculate change in frontend)
    // But for other methods, don't exceed total
    if (args.paymentMethod !== "CASH" && newPaidAmount > sale.totalAmount) {
      throw new Error("Total payments cannot exceed sale total");
    }

    const paymentId = await ctx.db.insert("salePayments", {
      saleId: args.saleId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      paymentDate: args.paymentDate,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Update sale paid amount and outstanding
    const paidAmount = Math.min(newPaidAmount, sale.totalAmount);
    const outstandingAmount = sale.totalAmount - paidAmount;

    await ctx.db.patch(args.saleId, {
      paidAmount,
      outstandingAmount,
      updatedBy: undefined,
    });

    return paymentId;
  },
});

// Remove payment (only for draft sales)
export const removePayment = mutation({
  args: {
    paymentId: v.id("salePayments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const sale = await ctx.db.get(payment.saleId);
    if (!sale) throw new Error("Sale not found");
    
    if (sale.status !== "Draft") {
      throw new Error("Can only remove payments from draft sales");
    }

    // Soft delete payment
    await ctx.db.patch(args.paymentId, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    // Recalculate paid amount
    const payments = await ctx.db
      .query("salePayments")
      .withIndex("by_sale", (q) => q.eq("saleId", payment.saleId))
      .collect();

    const paidAmount = payments
      .filter(p => !p.deletedAt)
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingAmount = sale.totalAmount - paidAmount;

    await ctx.db.patch(payment.saleId, {
      paidAmount,
      outstandingAmount,
      updatedBy: undefined,
    });

    return payment.saleId;
  },
});

// Get payments for a sale
export const getBySale = query({
  args: { saleId: v.id("sales") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("salePayments")
      .withIndex("by_sale", (q) => q.eq("saleId", args.saleId))
      .collect();

    return payments.filter(p => !p.deletedAt);
  },
});

// List payments by method (for reporting)
export const listByMethod = query({
  args: { 
    paymentMethod: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db
      .query("salePayments")
      .withIndex("by_payment_method", (q) => 
        q.eq("paymentMethod", args.paymentMethod)
      )
      .collect();

    // Filter by date range if provided
    if (args.startDate) {
      payments = payments.filter(p => p.paymentDate >= args.startDate!);
    }
    if (args.endDate) {
      payments = payments.filter(p => p.paymentDate <= args.endDate!);
    }

    // Filter out deleted
    payments = payments.filter(p => !p.deletedAt);

    // Enrich with sale details
    const enriched = await Promise.all(
      payments.map(async (payment) => {
        const sale = await ctx.db.get(payment.saleId);
        let customer = null;
        if (sale) {
          customer = await ctx.db.get(sale.customerId);
        }

        return {
          ...payment,
          sale,
          customer,
        };
      })
    );

    return enriched;
  },
});

// Get payment summary by date range
export const getSummaryByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("salePayments")
      .withIndex("by_payment_date")
      .collect();

    // Filter by date range and branch
    let filtered = payments.filter(
      p => !p.deletedAt && 
      p.paymentDate >= args.startDate && 
      p.paymentDate <= args.endDate
    );

    if (args.branchId) {
      const branchSales = await ctx.db
        .query("sales")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .collect();
      
      const branchSaleIds = new Set(branchSales.map(s => s._id));
      filtered = filtered.filter(p => branchSaleIds.has(p.saleId));
    }

    // Group by payment method
    const summary: Record<string, { count: number; total: number }> = {};
    
    filtered.forEach(payment => {
      if (!summary[payment.paymentMethod]) {
        summary[payment.paymentMethod] = { count: 0, total: 0 };
      }
      summary[payment.paymentMethod].count++;
      summary[payment.paymentMethod].total += payment.amount;
    });

    return summary;
  },
});
