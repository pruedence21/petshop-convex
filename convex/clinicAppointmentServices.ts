import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create appointment service/item
export const create = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    serviceId: v.id("products"),
    productId: v.optional(v.id("products")),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.number(),
    discountType: v.string(),
    isPrescription: v.boolean(),
    prescriptionDosage: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("clinicAppointmentServices"),
  handler: async (ctx, args) => {
    // Calculate subtotal
    const baseAmount = args.quantity * args.unitPrice;
    let subtotal = baseAmount;

    if (args.discountType === "percent") {
      subtotal = baseAmount - (baseAmount * args.discountAmount) / 100;
    } else {
      subtotal = baseAmount - args.discountAmount;
    }

    const serviceId = await ctx.db.insert("clinicAppointmentServices", {
      appointmentId: args.appointmentId,
      serviceId: args.serviceId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount: args.discountAmount,
      discountType: args.discountType,
      subtotal,
      isPrescription: args.isPrescription,
      prescriptionDosage: args.prescriptionDosage,
      notes: args.notes,
      createdBy: undefined,
    });

    // Recalculate appointment totals
    await recalculateAppointmentTotals(ctx, args.appointmentId);

    return serviceId;
  },
});

// List services for appointment
export const list = query({
  args: { appointmentId: v.id("clinicAppointments") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("clinicAppointmentServices")
      .withIndex("by_appointment", (q: any) => q.eq("appointmentId", args.appointmentId))
      .collect();

    const activeServices = services.filter((s: any) => !s.deletedAt);

    // Enrich with product data
    const enriched = await Promise.all(
      activeServices.map(async (service: any) => {
        const serviceData = await ctx.db.get(service.serviceId);
        const productData = service.productId ? await ctx.db.get(service.productId) : null;
        const variantData = service.variantId ? await ctx.db.get(service.variantId) : null;

        return {
          ...service,
          service: serviceData,
          product: productData,
          variant: variantData,
        };
      })
    );

    return enriched;
  },
});

// Remove service (soft delete)
export const remove = mutation({
  args: { id: v.id("clinicAppointmentServices") },
  returns: v.id("clinicAppointmentServices"),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Service not found");

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    // Recalculate appointment totals
    await recalculateAppointmentTotals(ctx, service.appointmentId);

    return args.id;
  },
});

// Helper: Recalculate appointment totals
async function recalculateAppointmentTotals(ctx: any, appointmentId: any) {
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment) return;

  const services = await ctx.db
    .query("clinicAppointmentServices")
    .withIndex("by_appointment", (q: any) => q.eq("appointmentId", appointmentId))
    .collect();

  const activeServices = services.filter((s: any) => !s.deletedAt);

  // Calculate subtotal from all services
  const subtotal = activeServices.reduce((sum: number, s: any) => sum + s.subtotal, 0);

  // Apply transaction-level discount
  let discountedTotal = subtotal;
  if (appointment.discountType === "percent") {
    discountedTotal = subtotal - (subtotal * appointment.discountAmount) / 100;
  } else {
    discountedTotal = subtotal - appointment.discountAmount;
  }

  // Calculate tax
  const taxAmount = (discountedTotal * appointment.taxRate) / 100;
  const totalAmount = discountedTotal + taxAmount;

  // Update appointment
  await ctx.db.patch(appointmentId, {
    subtotal,
    taxAmount,
    totalAmount,
    outstandingAmount: totalAmount - appointment.paidAmount,
    updatedBy: undefined,
  });
}
