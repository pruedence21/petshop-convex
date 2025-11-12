import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { reduceStockForSaleHelper } from "./productStock";

// List consumables for a booking
export const list = query({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelConsumables"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      productId: v.id("products"),
      variantId: v.optional(v.id("productVariants")),
      consumptionDate: v.number(),
      quantity: v.number(),
      unitPrice: v.number(),
      subtotal: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const consumables = await ctx.db
      .query("hotelConsumables")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return consumables.filter((consumable) => !consumable.deletedAt);
  },
});

// Get single consumable
export const get = query({
  args: { id: v.id("hotelConsumables") },
  returns: v.union(
    v.object({
      _id: v.id("hotelConsumables"),
      _creationTime: v.number(),
      bookingId: v.id("hotelBookings"),
      productId: v.id("products"),
      variantId: v.optional(v.id("productVariants")),
      consumptionDate: v.number(),
      quantity: v.number(),
      unitPrice: v.number(),
      subtotal: v.number(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const consumable = await ctx.db.get(args.id);
    if (!consumable || consumable.deletedAt) return null;
    return consumable;
  },
});

// Add consumable to booking (reduces stock)
export const add = mutation({
  args: {
    bookingId: v.id("hotelBookings"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    consumptionDate: v.number(),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("hotelConsumables"),
  handler: async (ctx, args) => {
    // Validate booking exists and is checked in
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "CheckedIn") {
      throw new Error("Can only add consumables to checked-in bookings");
    }

    // Check if customer brought own food
    if (booking.ownFood) {
      throw new Error(
        "Customer brought own food. Cannot charge for consumables."
      );
    }

    // Validate product exists
    const product = await ctx.db.get(args.productId);
    if (!product || product.deletedAt) {
      throw new Error("Product not found");
    }

    if (product.type === "service") {
      throw new Error("Cannot add services as consumables. Use booking services instead.");
    }

    // Reduce stock and get cost
    const { cogs, avgCost } = await reduceStockForSaleHelper(ctx, {
      branchId: booking.branchId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      saleId: args.bookingId as any, // Reference to booking (type mismatch accepted)
    });

    // Log stock movement specifically for hotel consumption
    await ctx.db.insert("stockMovements", {
      branchId: booking.branchId,
      productId: args.productId,
      variantId: args.variantId,
      movementType: "HOTEL_CONSUMPTION",
      quantity: -args.quantity,
      referenceType: "HotelBooking",
      referenceId: args.bookingId,
      movementDate: args.consumptionDate,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Calculate subtotal (using average cost as unit price)
    const subtotal = args.quantity * avgCost;

    const consumableId = await ctx.db.insert("hotelConsumables", {
      bookingId: args.bookingId,
      productId: args.productId,
      variantId: args.variantId,
      consumptionDate: args.consumptionDate,
      quantity: args.quantity,
      unitPrice: avgCost,
      subtotal,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Recalculate booking total
    await ctx.runMutation(internal.hotelBookings.recalculateTotal, {
      bookingId: args.bookingId,
    });

    return consumableId;
  },
});

// Update consumable (NOTE: Does NOT adjust stock - stock already reduced on add)
export const update = mutation({
  args: {
    id: v.id("hotelConsumables"),
    consumptionDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const consumable = await ctx.db.get(id);
    if (!consumable || consumable.deletedAt) {
      throw new Error("Consumable not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(consumable.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot update consumables in completed or cancelled booking");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Remove consumable (NOTE: Does NOT restore stock - manual adjustment required)
export const remove = mutation({
  args: { id: v.id("hotelConsumables") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const consumable = await ctx.db.get(args.id);
    if (!consumable || consumable.deletedAt) {
      throw new Error("Consumable not found");
    }

    // Validate booking status
    const booking = await ctx.db.get(consumable.bookingId);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot remove consumables from completed or cancelled booking");
    }

    // Note: Stock has already been reduced. To restore stock, admin must do manual adjustment.
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });

    // Recalculate booking total
    await ctx.runMutation(internal.hotelBookings.recalculateTotal, {
      bookingId: consumable.bookingId,
    });

    return null;
  },
});

// Get daily consumables summary for a booking
export const getDailySummary = query({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.array(
    v.object({
      date: v.number(),
      totalQuantity: v.number(),
      totalAmount: v.number(),
      items: v.array(
        v.object({
          productName: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          subtotal: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const consumables = await ctx.db
      .query("hotelConsumables")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const activeConsumables = consumables.filter((c) => !c.deletedAt);

    // Group by consumption date
    const dailyMap = new Map<number, any[]>();

    for (const consumable of activeConsumables) {
      const dateOnly = new Date(consumable.consumptionDate);
      dateOnly.setHours(0, 0, 0, 0);
      const dateKey = dateOnly.getTime();

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }

      const product = await ctx.db.get(consumable.productId);
      dailyMap.get(dateKey)!.push({
        productName: product?.name || "Unknown Product",
        quantity: consumable.quantity,
        unitPrice: consumable.unitPrice,
        subtotal: consumable.subtotal,
      });
    }

    // Convert to array and calculate totals
    const summary = Array.from(dailyMap.entries()).map(([date, items]) => ({
      date,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
      items,
    }));

    // Sort by date
    summary.sort((a, b) => a.date - b.date);

    return summary;
  },
});
