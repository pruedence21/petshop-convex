import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Laporan Hotel Hewan
 * Pet Hotel/Boarding Reports
 */

// Ringkasan Hotel (Hotel Summary)
export const getHotelSummary = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    summary: v.object({
      totalBookings: v.number(),
      checkedInBookings: v.number(),
      checkedOutBookings: v.number(),
      cancelledBookings: v.number(),
      totalRevenue: v.number(),
      roomRevenue: v.number(),
      servicesRevenue: v.number(),
      consumablesRevenue: v.number(),
      averageStayDuration: v.number(),
      occupancyRate: v.number(),
      outstandingAmount: v.number(),
    }),
    revenueByRoomType: v.array(
      v.object({
        roomType: v.string(),
        bookingCount: v.number(),
        revenue: v.number(),
      })
    ),
    bookingsByDay: v.array(
      v.object({
        date: v.number(),
        checkIns: v.number(),
        checkOuts: v.number(),
        occupancy: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get bookings in period
    const allBookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_check_in_date")
      .collect();

    const bookings = allBookings.filter((booking) => {
      if (booking.deletedAt) return false;
      // Include bookings that overlap with the period
      if (
        booking.checkInDate > args.endDate ||
        booking.checkOutDate < args.startDate
      )
        return false;
      if (args.branchId && booking.branchId !== args.branchId) return false;
      return true;
    });

    const checkedIn = bookings.filter(
      (b) => b.status === "CheckedIn" || b.status === "CheckedOut"
    );
    const checkedOut = bookings.filter((b) => b.status === "CheckedOut");
    const cancelled = bookings.filter((b) => b.status === "Cancelled");

    // Calculate revenue (only checked out bookings)
    const totalRevenue = checkedOut.reduce(
      (sum, b) => sum + b.totalAmount,
      0
    );
    const roomRevenue = checkedOut.reduce((sum, b) => sum + b.roomTotal, 0);
    const servicesRevenue = checkedOut.reduce(
      (sum, b) => sum + b.servicesTotal,
      0
    );
    const consumablesRevenue = checkedOut.reduce(
      (sum, b) => sum + b.consumablesTotal,
      0
    );

    // Average stay duration
    const totalDays = checkedOut.reduce((sum, b) => sum + b.numberOfDays, 0);
    const averageStayDuration =
      checkedOut.length > 0 ? totalDays / checkedOut.length : 0;

    // Outstanding amount
    const outstandingAmount = bookings.reduce(
      (sum, b) => sum + b.outstandingAmount,
      0
    );

    // Revenue by room type
    const roomTypeMap = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const booking of checkedOut) {
      const room = await ctx.db.get(booking.roomId);
      if (!room) continue;

      const existing = roomTypeMap.get(room.roomType) || {
        count: 0,
        revenue: 0,
      };
      roomTypeMap.set(room.roomType, {
        count: existing.count + 1,
        revenue: existing.revenue + booking.totalAmount,
      });
    }

    const revenueByRoomType = Array.from(roomTypeMap.entries()).map(
      ([roomType, data]) => ({
        roomType,
        bookingCount: data.count,
        revenue: data.revenue,
      })
    );

    // Bookings by day (check-ins and check-outs)
    const dayMap = new Map<
      string,
      { checkIns: number; checkOuts: number }
    >();

    for (const booking of checkedIn) {
      // Check-in day
      if (
        booking.actualCheckInDate &&
        booking.actualCheckInDate >= args.startDate &&
        booking.actualCheckInDate <= args.endDate
      ) {
        const dateKey = new Date(booking.actualCheckInDate)
          .toISOString()
          .split("T")[0];
        const existing = dayMap.get(dateKey) || { checkIns: 0, checkOuts: 0 };
        dayMap.set(dateKey, {
          checkIns: existing.checkIns + 1,
          checkOuts: existing.checkOuts,
        });
      }

      // Check-out day
      if (
        booking.actualCheckOutDate &&
        booking.actualCheckOutDate >= args.startDate &&
        booking.actualCheckOutDate <= args.endDate
      ) {
        const dateKey = new Date(booking.actualCheckOutDate)
          .toISOString()
          .split("T")[0];
        const existing = dayMap.get(dateKey) || { checkIns: 0, checkOuts: 0 };
        dayMap.set(dateKey, {
          checkIns: existing.checkIns,
          checkOuts: existing.checkOuts + 1,
        });
      }
    }

    // Calculate occupancy for each day
    const allRooms = await ctx.db.query("hotelRooms").collect();
    const activeRooms = allRooms.filter(
      (r) => !r.deletedAt && r.isActive && (!args.branchId || r.branchId === args.branchId)
    );
    const totalRoomCapacity = activeRooms.length;

    const bookingsByDay = Array.from(dayMap.entries())
      .map(([date, data]) => {
        const timestamp = new Date(date).getTime();
        // Count rooms occupied on this day
        const occupiedRooms = checkedIn.filter((b) => {
          const checkIn = b.actualCheckInDate || b.checkInDate;
          const checkOut = b.actualCheckOutDate || b.checkOutDate;
          return checkIn <= timestamp && checkOut >= timestamp;
        }).length;

        return {
          date: timestamp,
          checkIns: data.checkIns,
          checkOuts: data.checkOuts,
          occupancy:
            totalRoomCapacity > 0
              ? (occupiedRooms / totalRoomCapacity) * 100
              : 0,
        };
      })
      .sort((a, b) => a.date - b.date);

    // Overall occupancy rate (average across period)
    const avgOccupancy =
      bookingsByDay.length > 0
        ? bookingsByDay.reduce((sum, d) => sum + d.occupancy, 0) /
          bookingsByDay.length
        : 0;

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      summary: {
        totalBookings: bookings.length,
        checkedInBookings: checkedIn.length,
        checkedOutBookings: checkedOut.length,
        cancelledBookings: cancelled.length,
        totalRevenue,
        roomRevenue,
        servicesRevenue,
        consumablesRevenue,
        averageStayDuration,
        occupancyRate: avgOccupancy,
        outstandingAmount,
      },
      revenueByRoomType,
      bookingsByDay,
    };
  },
});

// Laporan Okupansi Kamar (Room Occupancy Report)
export const getRoomOccupancy = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      roomId: v.id("hotelRooms"),
      roomCode: v.string(),
      roomName: v.string(),
      roomType: v.string(),
      totalBookings: v.number(),
      totalDays: v.number(),
      revenue: v.number(),
      occupancyRate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allRooms = args.branchId
      ? await ctx.db
          .query("hotelRooms")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("hotelRooms").collect();
    const rooms = allRooms.filter((r) => !r.deletedAt && r.isActive);

    const periodDays =
      Math.ceil((args.endDate - args.startDate) / (1000 * 60 * 60 * 24)) + 1;

    const result = await Promise.all(
      rooms.map(async (room) => {
        const allBookings = await ctx.db
          .query("hotelBookings")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();

        const bookings = allBookings.filter((b) => {
          if (b.deletedAt) return false;
          if (b.status === "Cancelled") return false;
          // Booking overlaps with period
          return !(
            b.checkInDate > args.endDate || b.checkOutDate < args.startDate
          );
        });

        const totalDays = bookings.reduce((sum, b) => sum + b.numberOfDays, 0);
        const revenue = bookings
          .filter((b) => b.status === "CheckedOut")
          .reduce((sum, b) => sum + b.roomTotal, 0);

        const occupancyRate = periodDays > 0 ? (totalDays / periodDays) * 100 : 0;

        return {
          roomId: room._id,
          roomCode: room.code,
          roomName: room.name,
          roomType: room.roomType,
          totalBookings: bookings.length,
          totalDays,
          revenue,
          occupancyRate,
        };
      })
    );

    return result.sort((a, b) => b.revenue - a.revenue);
  },
});

// Laporan Tamu Hotel (Guest Report)
export const getGuestReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      customerId: v.id("customers"),
      customerName: v.string(),
      petId: v.id("customerPets"),
      petName: v.string(),
      totalStays: v.number(),
      totalNights: v.number(),
      totalSpent: v.number(),
      lastCheckIn: v.number(),
      outstandingAmount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allBookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_check_in_date")
      .collect();

    const bookings = allBookings.filter((booking) => {
      if (booking.deletedAt) return false;
      if (booking.status === "Cancelled") return false;
      if (
        booking.checkInDate > args.endDate ||
        booking.checkOutDate < args.startDate
      )
        return false;
      if (args.branchId && booking.branchId !== args.branchId) return false;
      return true;
    });

    const guestMap = new Map<
      string,
      {
        customerId: string;
        petId: string;
        stays: number;
        nights: number;
        spent: number;
        lastCheckIn: number;
        outstanding: number;
      }
    >();

    for (const booking of bookings) {
      const key = `${booking.customerId}-${booking.petId}`;
      const existing = guestMap.get(key) || {
        customerId: booking.customerId,
        petId: booking.petId,
        stays: 0,
        nights: 0,
        spent: 0,
        lastCheckIn: 0,
        outstanding: 0,
      };

      guestMap.set(key, {
        customerId: booking.customerId,
        petId: booking.petId,
        stays: existing.stays + 1,
        nights: existing.nights + booking.numberOfDays,
        spent: existing.spent + booking.totalAmount,
        lastCheckIn: Math.max(existing.lastCheckIn, booking.checkInDate),
        outstanding: existing.outstanding + booking.outstandingAmount,
      });
    }

    const result = await Promise.all(
      Array.from(guestMap.entries()).map(async ([, data]) => {
        const customer = await ctx.db.get(data.customerId as any) as any;
        const pet = await ctx.db.get(data.petId as any) as any;

        return {
          customerId: data.customerId as any,
          customerName: customer?.name || "Unknown",
          petId: data.petId as any,
          petName: pet?.name || "Unknown",
          totalStays: data.stays,
          totalNights: data.nights,
          totalSpent: data.spent,
          lastCheckIn: data.lastCheckIn,
          outstandingAmount: data.outstanding,
        };
      })
    );

    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  },
});

// Laporan Layanan Hotel (Hotel Services Report)
export const getHotelServicesReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      serviceId: v.id("products"),
      serviceName: v.string(),
      timesProvided: v.number(),
      totalRevenue: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allBookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_check_in_date")
      .collect();

    const bookings = allBookings.filter((booking) => {
      if (booking.deletedAt) return false;
      if (booking.status === "Cancelled") return false;
      if (
        booking.checkInDate > args.endDate ||
        booking.checkOutDate < args.startDate
      )
        return false;
      if (args.branchId && booking.branchId !== args.branchId) return false;
      return true;
    });

    const bookingIds = bookings.map((b) => b._id);

    const allServices = await ctx.db.query("hotelBookingServices").collect();
    const services = allServices.filter(
      (s) => !s.deletedAt && bookingIds.includes(s.bookingId)
    );

    const serviceMap = new Map<
      string,
      { count: number; revenue: number }
    >();

    for (const service of services) {
      const existing = serviceMap.get(service.serviceId) || {
        count: 0,
        revenue: 0,
      };
      serviceMap.set(service.serviceId, {
        count: existing.count + service.quantity,
        revenue: existing.revenue + service.subtotal,
      });
    }

    const result = await Promise.all(
      Array.from(serviceMap.entries()).map(async ([serviceId, data]) => {
        const product = await ctx.db.get(serviceId as any) as any;

        return {
          serviceId: serviceId as any,
          serviceName: product?.name || "Unknown",
          timesProvided: data.count,
          totalRevenue: data.revenue,
        };
      })
    );

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
});
