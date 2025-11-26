import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

// Helper: Calculate service subtotal
function calculateServiceSubtotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
  discountType: string
): number {
  const baseAmount = quantity * unitPrice;

  if (discountType === "percent") {
    return baseAmount - (baseAmount * discountAmount) / 100;
  } else {
    return baseAmount - discountAmount;
  }
}

// List services for a booking
export const list = query({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelBookingServices"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      serviceId: v.id("products"),
      serviceDate: v.number(),
      quantity: v.number(),
      unitPrice: v.number(),
      discountAmount: v.number(),
      discountType: v.string(),
      subtotal: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("hotelBookingServices")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return services.filter((service) => !service.deletedAt);
  },
});

// Get single service
export const get = query({
  args: { id: v.id("hotelBookingServices") },
  returns: v.union(
    v.object({
      _id: v.id("hotelBookingServices"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      serviceId: v.id("products"),
      serviceDate: v.number(),
      quantity: v.number(),
      unitPrice: v.number(),
      discountAmount: v.number(),
      discountType: v.string(),
      subtotal: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service || service.deletedAt) return null;
    return service;
  },
});

// Add service to booking
export const add = mutation({
  args: {
    bookingId: v.id("hotelBookings"),
    serviceId: v.id("products"),
    serviceDate: v.number(),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("hotelBookingServices"),
  handler: async (ctx, args) => {
    // Validate booking exists and is not completed
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot add services to completed or cancelled booking");
    }

    // Validate service exists
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.deletedAt) {
      throw new Error("Service not found");
    }

    if (service.type !== "service") {
      throw new Error("Product is not a service");
    }

    // Calculate subtotal
    const discountAmount = args.discountAmount || 0;
    const discountType = args.discountType || "nominal";
    const subtotal = calculateServiceSubtotal(
      args.quantity,
      args.unitPrice,
      discountAmount,
      discountType
    );

    const serviceItemId = await ctx.db.insert("hotelBookingServices", {
      bookingId: args.bookingId,
      serviceId: args.serviceId,
      serviceDate: args.serviceDate,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount,
      discountType,
      subtotal,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Recalculate booking total
    await ctx.runMutation(internal.hotel.hotelBookings.recalculateTotal, {
      bookingId: args.bookingId,
    });

    return serviceItemId;
  },
});

// Update service
export const update = mutation({
  args: {
    id: v.id("hotelBookingServices"),
    serviceId: v.optional(v.id("products")),
    serviceDate: v.optional(v.number()),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const service = await ctx.db.get(id);
    if (!service || service.deletedAt) {
      throw new Error("Service not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(service.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot update services in completed or cancelled booking");
    }

    // If service changed, validate it
    if (updates.serviceId) {
      const newService = await ctx.db.get(updates.serviceId);
      if (!newService || newService.deletedAt) {
        throw new Error("Service not found");
      }
      if (newService.type !== "service") {
        throw new Error("Product is not a service");
      }
    }

    // Recalculate subtotal if pricing changed
    const quantity = updates.quantity ?? service.quantity;
    const unitPrice = updates.unitPrice ?? service.unitPrice;
    const discountAmount = updates.discountAmount ?? service.discountAmount;
    const discountType = updates.discountType ?? service.discountType;

    const subtotal = calculateServiceSubtotal(
      quantity,
      unitPrice,
      discountAmount,
      discountType
    );

    await ctx.db.patch(id, {
      ...updates,
      subtotal,
      updatedBy: undefined, // TODO: auth integration
    });

    // Recalculate booking total
    await ctx.runMutation(internal.hotel.hotelBookings.recalculateTotal, {
      bookingId: service.bookingId,
    });

    return null;
  },
});

// Remove service
export const remove = mutation({
  args: { id: v.id("hotelBookingServices") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service || service.deletedAt) {
      throw new Error("Service not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(service.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot remove services from completed or cancelled booking");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });

    // Recalculate booking total
    await ctx.runMutation(internal.hotel.hotelBookings.recalculateTotal, {
      bookingId: service.bookingId,
    });

    return null;
  },
});





