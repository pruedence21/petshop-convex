import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// List all hotel rooms
export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    roomType: v.optional(v.string()),
    status: v.optional(v.string()),
    animalCategory: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelRooms"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      branchId: v.id("branches"),
      roomType: v.string(),
      animalCategory: v.string(),
      size: v.string(),
      dailyRate: v.number(),
      capacity: v.number(),
      amenities: v.array(v.string()),
      description: v.optional(v.string()),
      status: v.string(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let rooms;

    if (args.branchId) {
      rooms = await ctx.db
        .query("hotelRooms")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .collect();
    } else {
      rooms = await ctx.db.query("hotelRooms").collect();
    }

    return rooms.filter((room) => {
      if (room.deletedAt) return false;
      if (args.roomType && room.roomType !== args.roomType) return false;
      if (args.status && room.status !== args.status) return false;
      if (args.animalCategory && room.animalCategory !== args.animalCategory) {
        return false;
      }
      return true;
    });
  },
});

// Get single hotel room
export const get = query({
  args: { id: v.id("hotelRooms") },
  returns: v.union(
    v.object({
      _id: v.id("hotelRooms"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      branchId: v.id("branches"),
      roomType: v.string(),
      animalCategory: v.string(),
      size: v.string(),
      dailyRate: v.number(),
      capacity: v.number(),
      amenities: v.array(v.string()),
      description: v.optional(v.string()),
      status: v.string(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room || room.deletedAt) return null;
    return room;
  },
});

// Get room by code
export const getByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("hotelRooms"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      branchId: v.id("branches"),
      roomType: v.string(),
      animalCategory: v.string(),
      size: v.string(),
      dailyRate: v.number(),
      capacity: v.number(),
      amenities: v.array(v.string()),
      description: v.optional(v.string()),
      status: v.string(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query("hotelRooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .collect();

    const room = rooms.find((r) => !r.deletedAt);
    return room || null;
  },
});

// Create hotel room
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    branchId: v.id("branches"),
    roomType: v.string(),
    animalCategory: v.string(),
    size: v.string(),
    dailyRate: v.number(),
    capacity: v.number(),
    amenities: v.array(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  returns: v.id("hotelRooms"),
  handler: async (ctx, args) => {
    // Check if code already exists
    const existing = await ctx.db
      .query("hotelRooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .collect();

    if (existing.some((r) => !r.deletedAt)) {
      throw new Error(`Room code ${args.code} already exists`);
    }

    const roomId = await ctx.db.insert("hotelRooms", {
      code: args.code,
      name: args.name,
      branchId: args.branchId,
      roomType: args.roomType,
      animalCategory: args.animalCategory,
      size: args.size,
      dailyRate: args.dailyRate,
      capacity: args.capacity,
      amenities: args.amenities,
      description: args.description,
      status: "Available", // Default status
      isActive: args.isActive,
      createdBy: undefined, // TODO: auth integration
    });

    return roomId;
  },
});

// Update hotel room
export const update = mutation({
  args: {
    id: v.id("hotelRooms"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    roomType: v.optional(v.string()),
    animalCategory: v.optional(v.string()),
    size: v.optional(v.string()),
    dailyRate: v.optional(v.number()),
    capacity: v.optional(v.number()),
    amenities: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const room = await ctx.db.get(id);
    if (!room || room.deletedAt) {
      throw new Error("Room not found");
    }

    // If updating code, check uniqueness
    if (updates.code && updates.code !== room.code) {
      const existing = await ctx.db
        .query("hotelRooms")
        .withIndex("by_code", (q) => q.eq("code", updates.code!))
        .collect();

      if (existing.some((r) => !r.deletedAt && r._id !== id)) {
        throw new Error(`Room code ${updates.code} already exists`);
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Update room status
export const updateStatus = mutation({
  args: {
    id: v.id("hotelRooms"),
    status: v.string(), // "Available", "Occupied", "Reserved", "Maintenance"
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room || room.deletedAt) {
      throw new Error("Room not found");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Soft delete hotel room
export const remove = mutation({
  args: { id: v.id("hotelRooms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room || room.deletedAt) {
      throw new Error("Room not found");
    }

    // Check if room has active bookings
    const bookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.id))
      .collect();

    const hasActiveBookings = bookings.some(
      (booking) =>
        !booking.deletedAt &&
        (booking.status === "Reserved" || booking.status === "CheckedIn")
    );

    if (hasActiveBookings) {
      throw new Error("Cannot delete room with active bookings");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: auth integration
    });

    return null;
  },
});

// Check room availability for date range
export const checkAvailability = query({
  args: {
    roomId: v.id("hotelRooms"),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    excludeBookingId: v.optional(v.id("hotelBookings")), // For editing existing booking
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.deletedAt || !room.isActive) {
      return false;
    }

    // Find overlapping bookings
    const bookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const hasOverlap = bookings.some((booking) => {
      // Skip deleted, cancelled bookings, or the booking being edited
      if (booking.deletedAt || booking.status === "Cancelled") return false;
      if (booking.status === "CheckedOut") return false;
      if (args.excludeBookingId && booking._id === args.excludeBookingId)
        return false;

      // Check date overlap
      // Overlap occurs if:
      // 1. New check-in is during existing booking
      // 2. New check-out is during existing booking
      // 3. New booking completely encompasses existing booking
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

    return !hasOverlap; // true if available
  },
});

// Get available rooms for date range
export const getAvailableRooms = query({
  args: {
    branchId: v.id("branches"),
    checkInDate: v.number(),
    checkOutDate: v.number(),
    animalCategory: v.optional(v.string()),
    roomType: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("hotelRooms"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      branchId: v.id("branches"),
      roomType: v.string(),
      animalCategory: v.string(),
      size: v.string(),
      dailyRate: v.number(),
      capacity: v.number(),
      amenities: v.array(v.string()),
      description: v.optional(v.string()),
      status: v.string(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all rooms for branch
    const rooms = await ctx.db
      .query("hotelRooms")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .collect();

    // Filter by criteria
    let filtered = rooms.filter((room) => {
      if (room.deletedAt || !room.isActive) return false;
      if (args.animalCategory && room.animalCategory !== args.animalCategory)
        return false;
      if (args.roomType && room.roomType !== args.roomType) return false;
      return true;
    });

    // Check availability for each room manually (inline logic)
    const availableRooms = [];
    for (const room of filtered) {
      // Find overlapping bookings for this room
      const bookings = await ctx.db
        .query("hotelBookings")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const hasOverlap = bookings.some((booking) => {
        // Skip deleted, cancelled bookings
        if (booking.deletedAt || booking.status === "Cancelled") return false;
        if (booking.status === "CheckedOut") return false;

        // Check date overlap
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

      if (!hasOverlap) {
        availableRooms.push(room);
      }
    }

    return availableRooms;
  },
});
