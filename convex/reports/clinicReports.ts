import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Laporan Klinik Hewan
 * Veterinary Clinic Reports
 */

// Ringkasan Klinik (Clinic Summary)
export const getClinicSummary = query({
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
      totalAppointments: v.number(),
      completedAppointments: v.number(),
      cancelledAppointments: v.number(),
      scheduledAppointments: v.number(),
      totalRevenue: v.number(),
      averageRevenue: v.number(),
      totalPatients: v.number(),
      outstandingAmount: v.number(),
    }),
    serviceRevenue: v.array(
      v.object({
        serviceId: v.id("products"),
        serviceName: v.string(),
        appointmentCount: v.number(),
        revenue: v.number(),
        percentage: v.number(),
      })
    ),
    staffPerformance: v.array(
      v.object({
        staffId: v.id("clinicStaff"),
        staffName: v.string(),
        appointmentCount: v.number(),
        revenue: v.number(),
      })
    ),
    appointmentsByDay: v.array(
      v.object({
        date: v.number(),
        count: v.number(),
        revenue: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get appointments in period
    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();

    const appointments = allAppointments.filter((apt) => {
      if (apt.deletedAt) return false;
      if (
        apt.appointmentDate < args.startDate ||
        apt.appointmentDate > args.endDate
      )
        return false;
      if (args.branchId && apt.branchId !== args.branchId) return false;
      return true;
    });

    const completed = appointments.filter((a) => a.status === "Completed");
    const cancelled = appointments.filter((a) => a.status === "Cancelled");
    const scheduled = appointments.filter(
      (a) => a.status === "Scheduled" || a.status === "InProgress"
    );

    // Calculate summary
    const totalRevenue = completed.reduce((sum, a) => sum + a.totalAmount, 0);
    const averageRevenue =
      completed.length > 0 ? totalRevenue / completed.length : 0;
    const outstandingAmount = completed.reduce(
      (sum, a) => sum + a.outstandingAmount,
      0
    );

    // Unique patients
    const uniquePatients = new Set(appointments.map((a) => a.petId));

    // Service revenue
    const appointmentIds = completed.map((a) => a._id);
    const allServices = await ctx.db
      .query("clinicAppointmentServices")
      .collect();
    const services = allServices.filter(
      (s) => !s.deletedAt && appointmentIds.includes(s.appointmentId)
    );

    const serviceRevenueMap = new Map<
      string,
      { count: number; revenue: number }
    >();
    for (const service of services) {
      const existing = serviceRevenueMap.get(service.serviceId) || {
        count: 0,
        revenue: 0,
      };
      serviceRevenueMap.set(service.serviceId, {
        count: existing.count + 1,
        revenue: existing.revenue + service.subtotal,
      });
    }

    const serviceRevenue = await Promise.all(
      Array.from(serviceRevenueMap.entries()).map(
        async ([serviceId, data]) => {
          const product = await ctx.db.get(serviceId as any);
          return {
            serviceId: serviceId as any,
            serviceName: product?.name || "Unknown",
            appointmentCount: data.count,
            revenue: data.revenue,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          };
        }
      )
    );

    // Staff performance
    const staffMap = new Map<
      string,
      { count: number; revenue: number }
    >();
    for (const apt of completed) {
      const existing = staffMap.get(apt.staffId) || {
        count: 0,
        revenue: 0,
      };
      staffMap.set(apt.staffId, {
        count: existing.count + 1,
        revenue: existing.revenue + apt.totalAmount,
      });
    }

    const staffPerformance = await Promise.all(
      Array.from(staffMap.entries()).map(async ([staffId, data]) => {
        const staff = await ctx.db.get(staffId as any);
        return {
          staffId: staffId as any,
          staffName: staff?.name || "Unknown",
          appointmentCount: data.count,
          revenue: data.revenue,
        };
      })
    );

    // Appointments by day
    const dayMap = new Map<string, { count: number; revenue: number }>();
    for (const apt of completed) {
      const dateKey = new Date(apt.appointmentDate).toISOString().split("T")[0];
      const existing = dayMap.get(dateKey) || { count: 0, revenue: 0 };
      dayMap.set(dateKey, {
        count: existing.count + 1,
        revenue: existing.revenue + apt.totalAmount,
      });
    }

    const appointmentsByDay = Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).getTime(),
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date - b.date);

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      summary: {
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        cancelledAppointments: cancelled.length,
        scheduledAppointments: scheduled.length,
        totalRevenue,
        averageRevenue,
        totalPatients: uniquePatients.size,
        outstandingAmount,
      },
      serviceRevenue: serviceRevenue.sort((a, b) => b.revenue - a.revenue),
      staffPerformance: staffPerformance.sort((a, b) => b.revenue - a.revenue),
      appointmentsByDay,
    };
  },
});

// Laporan Pasien (Patient Report)
export const getPatientReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      petId: v.id("customerPets"),
      petName: v.string(),
      customerId: v.id("customers"),
      customerName: v.string(),
      animalType: v.string(),
      visitCount: v.number(),
      totalSpent: v.number(),
      lastVisit: v.number(),
      outstandingAmount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();

    const appointments = allAppointments.filter((apt) => {
      if (apt.deletedAt) return false;
      if (apt.status !== "Completed") return false;
      if (
        apt.appointmentDate < args.startDate ||
        apt.appointmentDate > args.endDate
      )
        return false;
      if (args.branchId && apt.branchId !== args.branchId) return false;
      return true;
    });

    const patientMap = new Map<
      string,
      {
        customerId: string;
        visits: number;
        spent: number;
        lastVisit: number;
        outstanding: number;
      }
    >();

    for (const apt of appointments) {
      const existing = patientMap.get(apt.petId) || {
        customerId: apt.customerId,
        visits: 0,
        spent: 0,
        lastVisit: 0,
        outstanding: 0,
      };

      patientMap.set(apt.petId, {
        customerId: apt.customerId,
        visits: existing.visits + 1,
        spent: existing.spent + apt.totalAmount,
        lastVisit: Math.max(existing.lastVisit, apt.appointmentDate),
        outstanding: existing.outstanding + apt.outstandingAmount,
      });
    }

    const result = await Promise.all(
      Array.from(patientMap.entries()).map(async ([petId, data]) => {
        const pet = await ctx.db.get(petId as any);
        const customer = await ctx.db.get(data.customerId as any);
        const animalCategory = pet?.categoryId
          ? await ctx.db.get(pet.categoryId)
          : null;

        return {
          petId: petId as any,
          petName: pet?.name || "Unknown",
          customerId: data.customerId as any,
          customerName: customer?.name || "Unknown",
          animalType: animalCategory?.name || "Unknown",
          visitCount: data.visits,
          totalSpent: data.spent,
          lastVisit: data.lastVisit,
          outstandingAmount: data.outstanding,
        };
      })
    );

    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  },
});

// Laporan Layanan Klinik (Service Report)
export const getServiceReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      serviceId: v.id("products"),
      serviceName: v.string(),
      categoryName: v.string(),
      timesPerformed: v.number(),
      totalRevenue: v.number(),
      averagePrice: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();

    const appointments = allAppointments.filter((apt) => {
      if (apt.deletedAt) return false;
      if (apt.status !== "Completed") return false;
      if (
        apt.appointmentDate < args.startDate ||
        apt.appointmentDate > args.endDate
      )
        return false;
      if (args.branchId && apt.branchId !== args.branchId) return false;
      return true;
    });

    const appointmentIds = appointments.map((a) => a._id);
    const allServices = await ctx.db
      .query("clinicAppointmentServices")
      .collect();
    const services = allServices.filter(
      (s) => !s.deletedAt && appointmentIds.includes(s.appointmentId)
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
        const product = await ctx.db.get(serviceId as any);
        const category = product?.categoryId
          ? await ctx.db.get(product.categoryId)
          : null;

        return {
          serviceId: serviceId as any,
          serviceName: product?.name || "Unknown",
          categoryName: category?.name || "Unknown",
          timesPerformed: data.count,
          totalRevenue: data.revenue,
          averagePrice: data.count > 0 ? data.revenue / data.count : 0,
        };
      })
    );

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
});

// Laporan Diagnosis (Diagnosis Report)
export const getDiagnosisReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      diagnosis: v.string(),
      count: v.number(),
      animalTypes: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();

    const appointments = allAppointments.filter((apt) => {
      if (apt.deletedAt) return false;
      if (apt.status !== "Completed") return false;
      if (!apt.diagnosis) return false; // Only with diagnosis
      if (
        apt.appointmentDate < args.startDate ||
        apt.appointmentDate > args.endDate
      )
        return false;
      if (args.branchId && apt.branchId !== args.branchId) return false;
      return true;
    });

    const diagnosisMap = new Map<string, Set<string>>();

    for (const apt of appointments) {
      if (!apt.diagnosis) continue;

      const pet = await ctx.db.get(apt.petId);
      if (!pet) continue;

      const category = await ctx.db.get(pet.categoryId);
      const animalType = category?.name || "Unknown";

      if (!diagnosisMap.has(apt.diagnosis)) {
        diagnosisMap.set(apt.diagnosis, new Set());
      }
      diagnosisMap.get(apt.diagnosis)!.add(animalType);
    }

    const result = Array.from(diagnosisMap.entries()).map(
      ([diagnosis, animalTypes]) => ({
        diagnosis,
        count: appointments.filter((a) => a.diagnosis === diagnosis).length,
        animalTypes: Array.from(animalTypes),
      })
    );

    return result.sort((a, b) => b.count - a.count);
  },
});
