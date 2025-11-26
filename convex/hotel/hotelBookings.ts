import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { calculateLine, LineItemInput } from "../../lib/finance";
import { getOrGenerateTransactionNumber } from "../utils/autoNumbering";

// Helper: Calculate number of days (inclusive)
function calculateNumberOfDays(
  checkInDate: number,
  checkOutDate: number
): number {
  const diffMs = checkOutDate - checkInDate;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}



// List all bookings
export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    customerId: v.optional(v.id("customers")),
    status: v.optional(v.string()),
    roomId: v.optional(v.id("hotelRooms")),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelBookings"),
      _creationTime: v.number(),
      bookingNumber: v.string(),
      branchId: v.id("branches"),
      customerId: v.id("customers"),
      petId: v.id("customerPets"),
      roomId: v.id("hotelRooms"),
      checkInDate: v.number(),
      checkOutDate: v.number(),
      actualCheckInDate: v.optional(v.number()),
      actualCheckOutDate: v.optional(v.number()),
      status: v.string(),
      numberOfDays: v.number(),
      dailyRate: v.number(),
      roomTotal: v.number(),
      servicesTotal: v.number(),
      consumablesTotal: v.number(),
      subtotal: v.number(),
      discountAmount: v.number(),
      discountType: v.string(),
      taxAmount: v.number(),
      taxRate: v.number(),
      totalAmount: v.number(),
      paidAmount: v.number(),
      outstandingAmount: v.number(),
      specialRequests: v.optional(v.string()),
      emergencyContact: v.optional(v.string()),
      ownFood: v.boolean(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let bookings;

    if (args.branchId) {
      bookings = await ctx.db
        .query("hotelBookings")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .collect();
    } else if (args.customerId) {
      bookings = await ctx.db
        .query("hotelBookings")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .collect();
    } else if (args.roomId) {
      bookings = await ctx.db
        .query("hotelBookings")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId!))
        .collect();
    } else {
      bookings = await ctx.db.query("hotelBookings").collect();
    }

    return bookings.filter((booking) => {
      if (booking.deletedAt) return false;
      if (args.status && booking.status !== args.status) return false;
      return true;
    });
  },
});

// Get single booking
export const get = query({
  args: { id: v.id("hotelBookings") },
  returns: v.union(
    v.object({
      _id: v.id("hotelBookings"),
      _creationTime: v.number(),
      bookingNumber: v.string(),
      branchId: v.id("branches"),
      customerId: v.id("customers"),
      petId: v.id("customerPets"),
      roomId: v.id("hotelRooms"),
      checkInDate: v.number(),
      checkOutDate: v.number(),
      actualCheckInDate: v.optional(v.number()),
      actualCheckOutDate: v.optional(v.number()),
      status: v.string(),
      numberOfDays: v.number(),
      dailyRate: v.number(),
      roomTotal: v.number(),
      servicesTotal: v.number(),
      consumablesTotal: v.number(),
      subtotal: v.number(),
      discountAmount: v.number(),
      discountType: v.string(),
      taxAmount: v.number(),
      taxRate: v.number(),
      totalAmount: v.number(),
      paidAmount: v.number(),
      outstandingAmount: v.number(),
      specialRequests: v.optional(v.string()),
      emergencyContact: v.optional(v.string()),
      ownFood: v.boolean(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) return null;
    return booking;
  },
});

// Create booking (status: Reserved)
export const create = mutation({
  args: {
    branchId: v.id("branches"),
    customerId: v.id("customers"),
    petId: v.id("customerPets"),
    roomId: v.id("hotelRooms"),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    bookingNumber: v.optional(v.string()), // Optional: auto-generate if not provided
    specialRequests: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    ownFood: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    bookingId: v.id("hotelBookings"),
    bookingNumber: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate dates
    if (args.checkInDate >= args.checkOutDate) {
      throw new Error("Check-out date must be after check-in date");
    }

    // Check room availability
    const room = await ctx.db.get(args.roomId);
    if (!room || room.deletedAt || !room.isActive) {
      throw new Error("Room not found or inactive");
    }

    // Check if room is available for the date range
    const bookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const hasOverlap = bookings.some((booking) => {
      if (booking.deletedAt || booking.status === "Cancelled") return false;
      if (booking.status === "CheckedOut") return false;

      const overlapStart =
        args.checkInDate >= booking.checkInDate &&
        args.checkInDate < booking.checkOutDate;
      const overlapEnd =
        args.checkOutDate > booking.checkInDate &&
        args.checkOutDate <= booking.checkOutDate;
      const encompass =
        args.checkInDate <= booking.checkInDate &&
        args.checkOutDate >= booking.checkOutDate;

      return overlapStart || overlapEnd || encompass;
    });

    if (hasOverlap) {
      throw new Error("Room is not available for the selected dates");
    }

    // Verify pet belongs to customer
    const pet = await ctx.db.get(args.petId);
    if (!pet || pet.deletedAt || pet.customerId !== args.customerId) {
      throw new Error("Pet not found or does not belong to customer");
    }

    // Get or generate booking number (auto-generate if not provided, validate if custom)
    const bookingNumber = await getOrGenerateTransactionNumber(
      ctx,
      "hotelBookings",
      args.bookingNumber,
      new Date(args.checkInDate)
    );

    // Calculate pricing
    const numberOfDays = calculateNumberOfDays(
      args.checkInDate,
      args.checkOutDate
    );
    const roomTotal = numberOfDays * room.dailyRate;

    const bookingId = await ctx.db.insert("hotelBookings", {
      bookingNumber,
      branchId: args.branchId,
      customerId: args.customerId,
      petId: args.petId,
      roomId: args.roomId,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      status: "Reserved",
      numberOfDays,
      dailyRate: room.dailyRate, // Lock price at booking time
      roomTotal,
      servicesTotal: 0,
      consumablesTotal: 0,
      subtotal: roomTotal,
      discountAmount: 0,
      discountType: "nominal",
      taxAmount: 0,
      taxRate: 0,
      totalAmount: roomTotal,
      paidAmount: 0,
      outstandingAmount: roomTotal,
      specialRequests: args.specialRequests,
      emergencyContact: args.emergencyContact,
      ownFood: args.ownFood,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Update room status to Reserved
    await ctx.db.patch(args.roomId, {
      status: "Reserved",
    });

    return { bookingId, bookingNumber };
  },
});

// Update booking discount and tax
export const updateDiscountAndTax = mutation({
  args: {
    id: v.id("hotelBookings"),
    discountAmount: v.number(),
    discountType: v.string(),
    taxRate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut" || booking.status === "Cancelled") {
      throw new Error("Cannot update completed or cancelled booking");
    }

    // Recalculate totals using finance.ts
    const subtotal =
      booking.roomTotal + booking.servicesTotal + booking.consumablesTotal;
    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: subtotal,
      discountAmount: args.discountType === "nominal" ? args.discountAmount : 0,
      discountPercent: args.discountType === "percent" ? args.discountAmount : 0,
      taxPercent: args.taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;
    const outstandingAmount = totalAmount - booking.paidAmount;

    await ctx.db.patch(args.id, {
      discountAmount: args.discountAmount,
      discountType: args.discountType,
      taxRate: args.taxRate,
      taxAmount,
      subtotal,
      totalAmount,
      outstandingAmount,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Check-in booking
export const checkIn = mutation({
  args: {
    id: v.id("hotelBookings"),
    actualCheckInDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "Reserved") {
      throw new Error("Only reserved bookings can be checked in");
    }

    const actualCheckInDate = args.actualCheckInDate || Date.now();

    await ctx.db.patch(args.id, {
      status: "CheckedIn",
      actualCheckInDate,
      notes: args.notes ? `${booking.notes || ""}\n${args.notes}` : booking.notes,
      updatedBy: undefined, // TODO: auth integration
    });

    // Update room status to Occupied
    await ctx.db.patch(booking.roomId, {
      status: "Occupied",
    });

    return null;
  },
});

// Check-out booking
export const checkOut = mutation({
  args: {
    id: v.id("hotelBookings"),
    actualCheckOutDate: v.optional(v.number()),
    payments: v.array(
      v.object({
        amount: v.number(),
        paymentMethod: v.string(),
        referenceNumber: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "CheckedIn") {
      throw new Error("Only checked-in bookings can be checked out");
    }

    const actualCheckOutDate = args.actualCheckOutDate || Date.now();

    // Recalculate totals to ensure accuracy
    await ctx.runMutation(internal.hotel.hotelBookings.recalculateTotal, {
      bookingId: args.id,
    });

    // Get updated booking
    const updatedBooking = await ctx.db.get(args.id);
    if (!updatedBooking) throw new Error("Booking not found after update");

    // Process payments
    let totalPaymentAmount = updatedBooking.paidAmount;
    const paymentDate = Date.now();

    for (const payment of args.payments) {
      await ctx.db.insert("hotelPayments", {
        bookingId: args.id,
        paymentType: "FullPayment",
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        referenceNumber: payment.referenceNumber,
        paymentDate,
        notes: payment.notes,
        createdBy: undefined, // TODO: auth integration
      });

      totalPaymentAmount += payment.amount;
    }

    const outstandingAmount = updatedBooking.totalAmount - totalPaymentAmount;

    await ctx.db.patch(args.id, {
      status: "CheckedOut",
      actualCheckOutDate,
      paidAmount: totalPaymentAmount,
      outstandingAmount,
      notes: args.notes ? `${booking.notes || ""}\n${args.notes}` : booking.notes,
      updatedBy: undefined, // TODO: auth integration
    });

    // Update room status back to Available
    await ctx.db.patch(booking.roomId, {
      status: "Available",
    });

    return null;
  },
});

// Cancel booking
export const cancel = mutation({
  args: {
    id: v.id("hotelBookings"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedOut") {
      throw new Error("Cannot cancel completed booking");
    }

    if (booking.status === "Cancelled") {
      throw new Error("Booking already cancelled");
    }

    await ctx.db.patch(args.id, {
      status: "Cancelled",
      notes: args.reason
        ? `${booking.notes || ""}\nCancellation reason: ${args.reason}`
        : booking.notes,
      updatedBy: undefined, // TODO: auth integration
    });

    // Update room status back to Available
    await ctx.db.patch(booking.roomId, {
      status: "Available",
    });

    return null;
  },
});

// Internal: Recalculate booking total
export const recalculateTotal = internalMutation({
  args: {
    bookingId: v.id("hotelBookings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // Get services total
    const services = await ctx.db
      .query("hotelBookingServices")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();
    const servicesTotal = services
      .filter((s) => !s.deletedAt)
      .reduce((sum, s) => sum + s.subtotal, 0);

    // Get consumables total
    const consumables = await ctx.db
      .query("hotelConsumables")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();
    const consumablesTotal = consumables
      .filter((c) => !c.deletedAt)
      .reduce((sum, c) => sum + c.subtotal, 0);

    // Recalculate totals using finance.ts
    const subtotal = booking.roomTotal + servicesTotal + consumablesTotal;
    const transDiscountInput: LineItemInput = {
      quantity: 1,
      unitPrice: subtotal,
      discountAmount: booking.discountType === "nominal" ? booking.discountAmount : 0,
      discountPercent: booking.discountType === "percent" ? booking.discountAmount : 0,
      taxPercent: booking.taxRate,
    };
    const finalCalc = calculateLine(transDiscountInput);
    const taxAmount = finalCalc.taxAmount;
    const totalAmount = finalCalc.net;
    const outstandingAmount = totalAmount - booking.paidAmount;

    await ctx.db.patch(args.bookingId, {
      servicesTotal,
      consumablesTotal,
      subtotal,
      taxAmount,
      totalAmount,
      outstandingAmount,
    });

    return null;
  },
});

// Generate invoice data
export const generateInvoice = query({
  args: {
    id: v.id("hotelBookings"),
    invoiceType: v.string(), // "proforma" (at reservation) or "final" (at checkout)
  },
  returns: v.object({
    booking: v.object({
      bookingNumber: v.string(),
      checkInDate: v.number(),
      checkOutDate: v.number(),
      actualCheckInDate: v.optional(v.number()),
      actualCheckOutDate: v.optional(v.number()),
      numberOfDays: v.number(),
      status: v.string(),
    }),
    customer: v.object({
      name: v.string(),
      phone: v.string(),
      address: v.optional(v.string()),
    }),
    pet: v.object({
      name: v.string(),
      categoryName: v.string(),
      breed: v.optional(v.string()),
    }),
    room: v.object({
      code: v.string(),
      name: v.string(),
      roomType: v.string(),
      dailyRate: v.number(),
    }),
    lineItems: v.object({
      room: v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        subtotal: v.number(),
      }),
      services: v.array(
        v.object({
          serviceName: v.string(),
          serviceDate: v.number(),
          quantity: v.number(),
          unitPrice: v.number(),
          discount: v.number(),
          subtotal: v.number(),
        })
      ),
      consumables: v.array(
        v.object({
          productName: v.string(),
          consumptionDate: v.number(),
          quantity: v.number(),
          unitPrice: v.number(),
          subtotal: v.number(),
        })
      ),
    }),
    totals: v.object({
      subtotal: v.number(),
      discountAmount: v.number(),
      discountType: v.string(),
      taxAmount: v.number(),
      taxRate: v.number(),
      totalAmount: v.number(),
      paidAmount: v.number(),
      outstandingAmount: v.number(),
    }),
    payments: v.array(
      v.object({
        paymentType: v.string(),
        amount: v.number(),
        paymentMethod: v.string(),
        paymentDate: v.number(),
        referenceNumber: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    // Get customer
    const customer = await ctx.db.get(booking.customerId);
    if (!customer) throw new Error("Customer not found");

    // Get pet
    const pet = await ctx.db.get(booking.petId);
    if (!pet) throw new Error("Pet not found");

    // Get animal category
    const category = await ctx.db.get(pet.categoryId);

    // Get room
    const room = await ctx.db.get(booking.roomId);
    if (!room) throw new Error("Room not found");

    // Get services
    const services = await ctx.db
      .query("hotelBookingServices")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.id))
      .collect();

    const serviceItems = [];
    for (const service of services.filter((s) => !s.deletedAt)) {
      const product = await ctx.db.get(service.serviceId);
      serviceItems.push({
        serviceName: product?.name || "Unknown Service",
        serviceDate: service.serviceDate,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        discount: service.discountAmount,
        subtotal: service.subtotal,
      });
    }

    // Get consumables (only for final invoice)
    const consumableItems = [];
    if (args.invoiceType === "final") {
      const consumables = await ctx.db
        .query("hotelConsumables")
        .withIndex("by_booking", (q) => q.eq("bookingId", args.id))
        .collect();

      for (const consumable of consumables.filter((c) => !c.deletedAt)) {
        const product = await ctx.db.get(consumable.productId);
        consumableItems.push({
          productName: product?.name || "Unknown Product",
          consumptionDate: consumable.consumptionDate,
          quantity: consumable.quantity,
          unitPrice: consumable.unitPrice,
          subtotal: consumable.subtotal,
        });
      }
    }

    // Get payments
    const payments = await ctx.db
      .query("hotelPayments")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.id))
      .collect();

    const paymentItems = payments
      .filter((p) => !p.deletedAt)
      .map((p) => ({
        paymentType: p.paymentType,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
      }));

    return {
      booking: {
        bookingNumber: booking.bookingNumber,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        actualCheckInDate: booking.actualCheckInDate,
        actualCheckOutDate: booking.actualCheckOutDate,
        numberOfDays: booking.numberOfDays,
        status: booking.status,
      },
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      pet: {
        name: pet.name,
        categoryName: category?.name || "Unknown",
        breed: pet.breed,
      },
      room: {
        code: room.code,
        name: room.name,
        roomType: room.roomType,
        dailyRate: booking.dailyRate,
      },
      lineItems: {
        room: {
          description: `${room.name} - ${booking.numberOfDays} hari`,
          quantity: booking.numberOfDays,
          unitPrice: booking.dailyRate,
          subtotal: booking.roomTotal,
        },
        services: serviceItems,
        consumables: consumableItems,
      },
      totals: {
        subtotal: booking.subtotal,
        discountAmount: booking.discountAmount,
        discountType: booking.discountType,
        taxAmount: booking.taxAmount,
        taxRate: booking.taxRate,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        outstandingAmount: booking.outstandingAmount,
      },
      payments: paymentItems,
    };
  },
});

// Soft delete booking
export const remove = mutation({
  args: { id: v.id("hotelBookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking || booking.deletedAt) {
      throw new Error("Booking not found");
    }

    if (booking.status === "CheckedIn") {
      throw new Error("Cannot delete checked-in booking. Please check out first.");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });

    // If booking was reserved, free up the room
    if (booking.status === "Reserved") {
      await ctx.db.patch(booking.roomId, {
        status: "Available",
      });
    }

    return null;
  },
});





