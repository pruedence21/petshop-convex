import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { createPaymentReceivedJournalEntry } from "../finance/accountingHelpers";

// List payments for appointment
export const list = query({
  args: { appointmentId: v.id("clinicAppointments") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("clinicPayments")
      .withIndex("by_appointment", (q: any) => q.eq("appointmentId", args.appointmentId))
      .order("desc")
      .collect();

    return payments.filter((p: any) => !p.deletedAt);
  },
});

// Add payment
export const add = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    amount: v.number(),
    paymentMethod: v.string(),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    const paymentDate = Date.now();

    const paymentId = await ctx.db.insert("clinicPayments", {
      appointmentId: args.appointmentId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      paymentDate,
      notes: args.notes,
      createdBy: undefined,
    });

    // Accounting
    await createPaymentReceivedJournalEntry(ctx, {
      paymentId,
      paymentDate,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      customerId: appointment.customerId,
      branchId: appointment.branchId,
    });

    // Update appointment
    const newPaid = (appointment.paidAmount || 0) + args.amount;
    const newOutstanding = appointment.totalAmount - newPaid;

    await ctx.db.patch(args.appointmentId, {
      paidAmount: newPaid,
      outstandingAmount: newOutstanding,
      updatedBy: undefined,
    });

    return paymentId;
  },
});
