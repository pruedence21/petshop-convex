import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create clinic staff
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    role: v.string(),
    specialization: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    branchId: v.id("branches"),
  },
  returns: v.id("clinicStaff"),
  handler: async (ctx, args) => {
    const staffId = await ctx.db.insert("clinicStaff", {
      code: args.code,
      name: args.name,
      role: args.role,
      specialization: args.specialization,
      phone: args.phone,
      email: args.email,
      branchId: args.branchId,
      isActive: true,
      createdBy: undefined,
    });
    return staffId;
  },
});

// List clinic staff
export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    role: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicStaff"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      role: v.string(),
      specialization: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      branchId: v.id("branches"),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      branch: v.union(
        v.null(),
        v.object({
          _id: v.id("branches"),
          _creationTime: v.number(),
          code: v.string(),
          name: v.string(),
          address: v.optional(v.string()),
          city: v.optional(v.string()),
          province: v.optional(v.string()),
          postalCode: v.optional(v.string()),
          phone: v.optional(v.string()),
          email: v.optional(v.string()),
          isActive: v.boolean(),
          createdBy: v.optional(v.id("users")),
          updatedBy: v.optional(v.id("users")),
          deletedAt: v.optional(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    let staff;

    if (args.branchId) {
      staff = await ctx.db
        .query("clinicStaff")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .collect();
    } else if (args.role) {
      staff = await ctx.db
        .query("clinicStaff")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .collect();
    } else {
      staff = await ctx.db.query("clinicStaff").collect();
    }

    // Filter based on includeInactive
    const filtered = !args.includeInactive
      ? staff.filter((s) => s.isActive && !s.deletedAt)
      : staff.filter((s) => !s.deletedAt);

    // Enrich with branch details
    const enriched = await Promise.all(
      filtered.map(async (s) => {
        const branch = await ctx.db.get(s.branchId);
        return {
          ...s,
          branch,
        };
      })
    );

    return enriched;
  },
});

// Get clinic staff by ID with branch
export const get = query({
  args: { id: v.id("clinicStaff") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("clinicStaff"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      role: v.string(),
      specialization: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      branchId: v.id("branches"),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      branch: v.union(
        v.null(),
        v.object({
          _id: v.id("branches"),
          _creationTime: v.number(),
          code: v.string(),
          name: v.string(),
          address: v.optional(v.string()),
          city: v.optional(v.string()),
          province: v.optional(v.string()),
          postalCode: v.optional(v.string()),
          phone: v.optional(v.string()),
          email: v.optional(v.string()),
          isActive: v.boolean(),
          createdBy: v.optional(v.id("users")),
          updatedBy: v.optional(v.id("users")),
          deletedAt: v.optional(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.id);
    if (!staff || staff.deletedAt) return null;

    const branch = await ctx.db.get(staff.branchId);

    return {
      ...staff,
      branch,
    };
  },
});

// Update clinic staff
export const update = mutation({
  args: {
    id: v.id("clinicStaff"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    specialization: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("clinicStaff"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Delete clinic staff (soft delete)
export const remove = mutation({
  args: { id: v.id("clinicStaff") },
  returns: v.id("clinicStaff"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Search clinic staff by name or code
export const search = query({
  args: {
    query: v.string(),
    branchId: v.optional(v.id("branches")),
    role: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicStaff"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      role: v.string(),
      specialization: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      branchId: v.id("branches"),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      branch: v.union(
        v.null(),
        v.object({
          _id: v.id("branches"),
          _creationTime: v.number(),
          code: v.string(),
          name: v.string(),
          address: v.optional(v.string()),
          city: v.optional(v.string()),
          province: v.optional(v.string()),
          postalCode: v.optional(v.string()),
          phone: v.optional(v.string()),
          email: v.optional(v.string()),
          isActive: v.boolean(),
          createdBy: v.optional(v.id("users")),
          updatedBy: v.optional(v.id("users")),
          deletedAt: v.optional(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    let staff;

    if (args.branchId) {
      staff = await ctx.db
        .query("clinicStaff")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .collect();
    } else if (args.role) {
      staff = await ctx.db
        .query("clinicStaff")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .collect();
    } else {
      staff = await ctx.db.query("clinicStaff").collect();
    }

    const filtered = staff.filter(
      (s) =>
        !s.deletedAt &&
        s.isActive &&
        (s.name.toLowerCase().includes(args.query.toLowerCase()) ||
          s.code.toLowerCase().includes(args.query.toLowerCase()))
    );

    // Enrich with branch details
    const enriched = await Promise.all(
      filtered.map(async (s) => {
        const branch = await ctx.db.get(s.branchId);
        return {
          ...s,
          branch,
        };
      })
    );

    return enriched;
  },
});

// Check staff availability for appointment slot
export const checkAvailability = query({
  args: {
    staffId: v.id("clinicStaff"),
    appointmentDate: v.number(),
    appointmentTime: v.string(),
    duration: v.number(), // in minutes
    excludeAppointmentId: v.optional(v.id("clinicAppointments")), // For rescheduling
  },
  returns: v.object({
    isAvailable: v.boolean(),
    conflictingAppointment: v.optional(
      v.object({
        _id: v.id("clinicAppointments"),
        appointmentNumber: v.string(),
        appointmentTime: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all appointments for this staff on the same date
    const appointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Filter by date and exclude cancelled/completed appointments (only check Scheduled)
    const sameDate = appointments.filter(
      (apt) =>
        apt.appointmentDate === args.appointmentDate &&
        apt.status === "Scheduled" &&
        !apt.deletedAt &&
        apt._id !== args.excludeAppointmentId
    );

    // Parse time to minutes (e.g., "09:30" -> 570)
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const requestedStart = parseTime(args.appointmentTime);
    const requestedEnd = requestedStart + args.duration;

    // Check for conflicts
    for (const apt of sameDate) {
      const aptStart = parseTime(apt.appointmentTime);
      
      // Get service duration for existing appointment
      const services = await ctx.db
        .query("clinicAppointmentServices")
        .withIndex("by_appointment", (q: any) => q.eq("appointmentId", apt._id))
        .collect();
      
      // Calculate total duration of existing appointment
      let aptDuration = 30; // Default 30 minutes
      if (services.length > 0) {
        const serviceDurations = await Promise.all(
          services.map(async (s: any) => {
            const service = await ctx.db.get(s.serviceId);
            return (service as any)?.serviceDuration || 30;
          })
        );
        aptDuration = Math.max(...serviceDurations);
      }
      
      const aptEnd = aptStart + aptDuration;

      // Check for overlap
      if (
        (requestedStart >= aptStart && requestedStart < aptEnd) ||
        (requestedEnd > aptStart && requestedEnd <= aptEnd) ||
        (requestedStart <= aptStart && requestedEnd >= aptEnd)
      ) {
        return {
          isAvailable: false,
          conflictingAppointment: {
            _id: apt._id,
            appointmentNumber: apt.appointmentNumber,
            appointmentTime: apt.appointmentTime,
          },
        };
      }
    }

    return {
      isAvailable: true,
    };
  },
});
