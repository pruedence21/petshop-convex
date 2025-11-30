import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { createPaymentReceivedJournalEntry } from "../finance/accountingHelpers";

// List payments for a booking
export const list = query({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelPayments"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      paymentType: v.string(),
      amount: v.number(),
      paymentMethod: v.string(),
      referenceNumber: v.optional(v.string()),
      paymentDate: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("hotelPayments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return payments.filter((payment) => !payment.deletedAt);
  },
});

// Get single payment
export const get = query({
  args: { id: v.id("hotelPayments") },
  returns: v.union(
    v.object({
      _id: v.id("hotelPayments"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      paymentType: v.string(),
      amount: v.number(),
      paymentMethod: v.string(),
      referenceNumber: v.optional(v.string()),
      paymentDate: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment || payment.deletedAt) return null;
    return payment;
  },
});

// Add payment to booking
export const add = mutation({
  args: {
    bookingId: v.id("hotelBookings"),
    paymentType: v.string(), // "Deposit", "Partial", "FullPayment", "Refund"
    amount: v.number(),
    paymentMethod: v.string(), // CASH, QRIS, CREDIT, BANK_TRANSFER, DEBIT_CARD
    referenceNumber: v.optional(v.string()),
    paymentDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("hotelPayments"),
  handler: async (ctx, args) => {
    // Validate booking exists
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "Cancelled") {
      throw new Error("Cannot add payment to cancelled booking");
    }

    // Validate payment amount
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const paymentDate = args.paymentDate || Date.now();

    const paymentId = await ctx.db.insert("hotelPayments", {
      bookingId: args.bookingId,
      paymentType: args.paymentType,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      paymentDate,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Create Journal Entry
    await createPaymentReceivedJournalEntry(ctx, {
      paymentId,
      paymentDate,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      customerId: booking.customerId,
      branchId: booking.branchId,
    });

    // Update booking paid amount
    const newPaidAmount = booking.paidAmount + args.amount;
    const newOutstandingAmount = booking.totalAmount - newPaidAmount;

    await ctx.db.patch(args.bookingId, {
      paidAmount: newPaidAmount,
      outstandingAmount: newOutstandingAmount,
      updatedBy: undefined, // TODO: auth integration
    });

    return paymentId;
  },
});

// Update payment
export const update = mutation({
  args: {
    id: v.id("hotelPayments"),
    paymentType: v.optional(v.string()),
    amount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    paymentDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const payment = await ctx.db.get(id);
    if (!payment || payment.deletedAt) {
      throw new Error("Payment not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(payment.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut") {
      throw new Error("Cannot update payment for checked-out booking");
    }

    // If amount changed, recalculate booking totals
    if (updates.amount !== undefined) {
      if (updates.amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      const amountDiff = updates.amount - payment.amount;
      const newPaidAmount = booking.paidAmount + amountDiff;
      const newOutstandingAmount = booking.totalAmount - newPaidAmount;

      await ctx.db.patch(payment.bookingId, {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        updatedBy: undefined, // TODO: auth integration
      });
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Remove payment
export const remove = mutation({
  args: { id: v.id("hotelPayments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment || payment.deletedAt) {
      throw new Error("Payment not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(payment.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut") {
      throw new Error("Cannot remove payment from checked-out booking");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });

    // Update booking paid amount
    const newPaidAmount = booking.paidAmount - payment.amount;
    const newOutstandingAmount = booking.totalAmount - newPaidAmount;

    await ctx.db.patch(payment.bookingId, {
      paidAmount: newPaidAmount,
      outstandingAmount: newOutstandingAmount,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Get payment summary for a booking
export const getSummary = query({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.object({
    totalPaid: v.number(),
    paymentsByType: v.array(
      v.object({
        paymentType: v.string(),
        count: v.number(),
        totalAmount: v.number(),
      })
    ),
    paymentsByMethod: v.array(
      v.object({
        paymentMethod: v.string(),
        count: v.number(),
        totalAmount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("hotelPayments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const activePayments = payments.filter((p) => !p.deletedAt);

    // Calculate total
    const totalPaid = activePayments.reduce((sum, p) => sum + p.amount, 0);

    // Group by payment type
    const typeMap = new Map<string, { count: number; totalAmount: number }>();
    for (const payment of activePayments) {
      const existing = typeMap.get(payment.paymentType) || {
        count: 0,
        totalAmount: 0,
      };
      typeMap.set(payment.paymentType, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + payment.amount,
      });
    }

    const paymentsByType = Array.from(typeMap.entries()).map(
      ([paymentType, data]) => ({
        paymentType,
        count: data.count,
        totalAmount: data.totalAmount,
      })
    );

    // Group by payment method
    const methodMap = new Map<string, { count: number; totalAmount: number }>();
    for (const payment of activePayments) {
      const existing = methodMap.get(payment.paymentMethod) || {
        count: 0,
        totalAmount: 0,
      };
      methodMap.set(payment.paymentMethod, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + payment.amount,
      });
    }

    const paymentsByMethod = Array.from(methodMap.entries()).map(
      ([paymentMethod, data]) => ({
        paymentMethod,
        count: data.count,
        totalAmount: data.totalAmount,
      })
    );

    return {
      totalPaid,
      paymentsByType,
      paymentsByMethod,
    };
  },
});



