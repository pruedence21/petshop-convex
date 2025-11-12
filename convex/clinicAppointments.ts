import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { reduceStockForSaleHelper } from "./productStock";

// Generate Appointment Number (APT-YYYYMMDD-001)
async function generateAppointmentNumber(ctx: any): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `APT-${dateStr}-`;

  const todayAppointments = await ctx.db
    .query("clinicAppointments")
    .withIndex("by_appointment_number")
    .collect();

  const todayFiltered = todayAppointments.filter((apt: any) =>
    apt.appointmentNumber.startsWith(prefix)
  );

  if (todayFiltered.length === 0) {
    return `${prefix}001`;
  }

  const maxNumber = Math.max(
    ...todayFiltered.map((apt: any) => {
      const numPart = apt.appointmentNumber.split("-")[2];
      return parseInt(numPart, 10);
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

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

// Helper: Calculate transaction discount
function calculateTransactionDiscount(
  subtotal: number,
  discountAmount: number,
  discountType: string
): number {
  if (discountType === "percent") {
    return (subtotal * discountAmount) / 100;
  } else {
    return discountAmount;
  }
}

// Create appointment (Draft/Scheduled status)
export const create = mutation({
  args: {
    branchId: v.id("branches"),
    petId: v.id("customerPets"),
    customerId: v.id("customers"),
    staffId: v.id("clinicStaff"),
    appointmentDate: v.number(),
    appointmentTime: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    appointmentId: v.id("clinicAppointments"),
    appointmentNumber: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check staff availability
    const appointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const conflictingAppointment = appointments.find(
      (apt) =>
        apt.appointmentDate === args.appointmentDate &&
        apt.appointmentTime === args.appointmentTime &&
        apt.status === "Scheduled" &&
        !apt.deletedAt
    );

    if (conflictingAppointment) {
      throw new Error(
        `Staff already has an appointment at ${args.appointmentTime} (${conflictingAppointment.appointmentNumber})`
      );
    }

    const appointmentNumber = await generateAppointmentNumber(ctx);

    const appointmentId = await ctx.db.insert("clinicAppointments", {
      appointmentNumber,
      branchId: args.branchId,
      petId: args.petId,
      customerId: args.customerId,
      staffId: args.staffId,
      appointmentDate: args.appointmentDate,
      appointmentTime: args.appointmentTime,
      status: "Scheduled",
      subtotal: 0,
      discountAmount: 0,
      discountType: "nominal",
      taxAmount: 0,
      taxRate: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      notes: args.notes,
      createdBy: undefined,
    });

    return { appointmentId, appointmentNumber };
  },
});

// Add service to appointment
export const addService = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    serviceId: v.id("products"), // Changed from clinicServices to products
    productId: v.optional(v.id("products")),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    isPrescription: v.optional(v.boolean()),
    prescriptionDosage: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("clinicAppointmentServices"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed")
      throw new Error("Cannot add services to completed appointment");
    if (appointment.status === "Cancelled")
      throw new Error("Cannot add services to cancelled appointment");

    const discountAmount = args.discountAmount || 0;
    const discountType = args.discountType || "nominal";
    const isPrescription = args.isPrescription || false;

    const subtotal = calculateServiceSubtotal(
      args.quantity,
      args.unitPrice,
      discountAmount,
      discountType
    );

    const serviceItemId = await ctx.db.insert("clinicAppointmentServices", {
      appointmentId: args.appointmentId,
      serviceId: args.serviceId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount,
      discountType,
      subtotal,
      isPrescription,
      prescriptionDosage: args.prescriptionDosage,
      prescriptionPickedUp: isPrescription ? false : undefined,
      notes: args.notes,
      createdBy: undefined,
    });

    // Recalculate appointment totals
    await recalculateAppointmentTotals(ctx, args.appointmentId);

    return serviceItemId;
  },
});

// Helper to recalculate appointment totals
async function recalculateAppointmentTotals(
  ctx: any,
  appointmentId: Id<"clinicAppointments">
) {
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment) return;

  const services = await ctx.db
    .query("clinicAppointmentServices")
    .withIndex("by_appointment", (q: any) => q.eq("appointmentId", appointmentId))
    .collect();

  const newSubtotal = services
    .filter((s: any) => !s.deletedAt)
    .reduce((sum: number, service: any) => sum + service.subtotal, 0);

  const transactionDiscount = calculateTransactionDiscount(
    newSubtotal,
    appointment.discountAmount,
    appointment.discountType
  );
  const afterDiscount = newSubtotal - transactionDiscount;
  const taxAmount =
    appointment.taxRate > 0 ? (afterDiscount * appointment.taxRate) / 100 : 0;
  const totalAmount = afterDiscount + taxAmount;

  await ctx.db.patch(appointmentId, {
    subtotal: newSubtotal,
    taxAmount,
    totalAmount,
    outstandingAmount: totalAmount - appointment.paidAmount,
    updatedBy: undefined,
  });
}

// Update service in appointment
export const updateService = mutation({
  args: {
    serviceItemId: v.id("clinicAppointmentServices"),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    prescriptionDosage: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("clinicAppointmentServices"),
  handler: async (ctx, args) => {
    const serviceItem = await ctx.db.get(args.serviceItemId);
    if (!serviceItem) throw new Error("Service item not found");

    const appointment = await ctx.db.get(serviceItem.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed")
      throw new Error("Cannot update services in completed appointment");

    const quantity = args.quantity ?? serviceItem.quantity;
    const unitPrice = args.unitPrice ?? serviceItem.unitPrice;
    const discountAmount = args.discountAmount ?? serviceItem.discountAmount;
    const discountType = args.discountType ?? serviceItem.discountType;

    const subtotal = calculateServiceSubtotal(
      quantity,
      unitPrice,
      discountAmount,
      discountType
    );

    await ctx.db.patch(args.serviceItemId, {
      quantity,
      unitPrice,
      discountAmount,
      discountType,
      subtotal,
      prescriptionDosage: args.prescriptionDosage,
      notes: args.notes,
      updatedBy: undefined,
    });

    // Recalculate totals
    await recalculateAppointmentTotals(ctx, serviceItem.appointmentId);

    return args.serviceItemId;
  },
});

// Remove service from appointment
export const removeService = mutation({
  args: {
    serviceItemId: v.id("clinicAppointmentServices"),
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const serviceItem = await ctx.db.get(args.serviceItemId);
    if (!serviceItem) throw new Error("Service item not found");

    const appointment = await ctx.db.get(serviceItem.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed")
      throw new Error("Cannot remove services from completed appointment");

    await ctx.db.patch(args.serviceItemId, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    // Recalculate totals
    await recalculateAppointmentTotals(ctx, serviceItem.appointmentId);

    return serviceItem.appointmentId;
  },
});

// Update appointment discount and tax
export const updateDiscountAndTax = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    discountAmount: v.optional(v.number()),
    discountType: v.optional(v.string()),
    taxRate: v.optional(v.number()),
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed")
      throw new Error("Cannot update completed appointment");

    const discountAmount = args.discountAmount ?? appointment.discountAmount;
    const discountType = args.discountType ?? appointment.discountType;
    const taxRate = args.taxRate ?? appointment.taxRate;

    await ctx.db.patch(args.appointmentId, {
      discountAmount,
      discountType,
      taxRate,
      updatedBy: undefined,
    });

    // Recalculate totals
    await recalculateAppointmentTotals(ctx, args.appointmentId);

    return args.appointmentId;
  },
});

// Reschedule appointment
export const reschedule = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    appointmentDate: v.number(),
    appointmentTime: v.string(),
    staffId: v.optional(v.id("clinicStaff")),
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status !== "Scheduled")
      throw new Error("Can only reschedule scheduled appointments");

    const newStaffId = args.staffId || appointment.staffId;

    // Check staff availability at new time
    const appointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_staff", (q) => q.eq("staffId", newStaffId))
      .collect();

    const conflictingAppointment = appointments.find(
      (apt) =>
        apt.appointmentDate === args.appointmentDate &&
        apt.appointmentTime === args.appointmentTime &&
        apt.status === "Scheduled" &&
        !apt.deletedAt &&
        apt._id !== args.appointmentId
    );

    if (conflictingAppointment) {
      throw new Error(
        `Staff already has an appointment at ${args.appointmentTime} (${conflictingAppointment.appointmentNumber})`
      );
    }

    await ctx.db.patch(args.appointmentId, {
      appointmentDate: args.appointmentDate,
      appointmentTime: args.appointmentTime,
      staffId: newStaffId,
      updatedBy: undefined,
    });

    return args.appointmentId;
  },
});

// Submit appointment with payments (Scheduled/InProgress → Completed)
export const submitAppointment = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    payments: v.array(
      v.object({
        amount: v.number(),
        paymentMethod: v.string(),
        referenceNumber: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    appointmentId: v.id("clinicAppointments"),
    status: v.string(),
    totalAmount: v.number(),
    paidAmount: v.number(),
    outstandingAmount: v.number(),
    change: v.number(),
    medicalRecordId: v.union(v.null(), v.id("petMedicalRecords")),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed") {
      throw new Error("Appointment already completed");
    }
    if (appointment.status === "Cancelled") {
      throw new Error("Cannot complete cancelled appointment");
    }

    // Get appointment services
    const services = await ctx.db
      .query("clinicAppointmentServices")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .collect();

    if (services.filter((s) => !s.deletedAt).length === 0) {
      throw new Error("Cannot submit appointment without services");
    }

    // Validate payments
    const totalPayments = args.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPayments > appointment.totalAmount) {
      const hasCash = args.payments.some((p) => p.paymentMethod === "CASH");
      if (!hasCash) {
        throw new Error(
          "Total payments cannot exceed appointment total (unless paying with cash)"
        );
      }
    }

    // Reduce stock for non-prescription services that require inventory
    for (const service of services.filter((s) => !s.deletedAt)) {
      if (service.isPrescription) {
        // Prescription: stock will be reduced on pickup
        continue;
      }

      if (service.productId) {
        try {
          await reduceStockForSaleHelper(ctx, {
            branchId: appointment.branchId,
            productId: service.productId,
            variantId: service.variantId,
            quantity: service.quantity,
            saleId: args.appointmentId as any, // Use appointmentId as reference
          });
        } catch (error: any) {
          const product = await ctx.db.get(service.productId);
          const productName = product?.name || "Unknown product";

          let variantInfo = "";
          if (service.variantId) {
            const variant = await ctx.db.get(service.variantId);
            variantInfo = variant ? ` (${variant.variantValue})` : "";
          }

          throw new Error(`${productName}${variantInfo}: ${error.message}`);
        }
      }
    }

    // Add payments
    const now = Date.now();
    let actualPaidAmount = 0;

    for (const payment of args.payments) {
      const paymentAmount =
        payment.paymentMethod === "CASH"
          ? Math.min(
              payment.amount,
              appointment.totalAmount - actualPaidAmount
            )
          : payment.amount;

      if (paymentAmount > 0) {
        await ctx.db.insert("clinicPayments", {
          appointmentId: args.appointmentId,
          amount: paymentAmount,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          paymentDate: now,
          notes: payment.notes,
          createdBy: undefined,
        });

        actualPaidAmount += paymentAmount;
      }
    }

    // Update appointment status to Completed
    const outstandingAmount = appointment.totalAmount - actualPaidAmount;

    await ctx.db.patch(args.appointmentId, {
      status: "Completed",
      paidAmount: actualPaidAmount,
      outstandingAmount,
      updatedBy: undefined,
    });

    // Auto-create medical record with clinical data
    let medicalRecordId = null;
    if (appointment.diagnosis || appointment.chiefComplaint) {
      // Get appointment services
      const services = await ctx.db
        .query("clinicAppointmentServices")
        .withIndex("by_appointment", (q: any) => q.eq("appointmentId", args.appointmentId))
        .collect();

      const activeServices = services.filter((s: any) => !s.deletedAt);

      // Aggregate treatment and prescription
      const treatmentList: string[] = [];
      const prescriptionList: string[] = [];

      for (const service of activeServices) {
        const serviceData = await ctx.db.get(service.serviceId);
        if (serviceData) {
          treatmentList.push(`${serviceData.name} (${service.quantity}x)`);
        }

        if (service.isPrescription && service.productId) {
          const product = await ctx.db.get(service.productId);
          let prescriptionText = product?.name || "Unknown";
          if (service.variantId) {
            const variant = await ctx.db.get(service.variantId);
            prescriptionText += variant ? ` ${variant.variantValue}` : "";
          }
          prescriptionText += ` - ${service.quantity}x`;
          if (service.prescriptionDosage) {
            prescriptionText += ` - ${service.prescriptionDosage}`;
          }
          prescriptionList.push(prescriptionText);
        }
      }

      // Get staff and branch names
      const staff = await ctx.db.get(appointment.staffId);
      const veterinarian = staff?.name || "Unknown";

      const branch = await ctx.db.get(appointment.branchId);
      const clinic = branch?.name || "Unknown";

      // Build comprehensive medical record
      let recordNotes = "";
      if (appointment.chiefComplaint) {
        recordNotes += `Keluhan: ${appointment.chiefComplaint}\n\n`;
      }
      if (appointment.temperature || appointment.weight || appointment.heartRate) {
        recordNotes += "Vital Signs:\n";
        if (appointment.temperature) recordNotes += `- Suhu: ${appointment.temperature}°C\n`;
        if (appointment.weight) recordNotes += `- Berat: ${appointment.weight} kg\n`;
        if (appointment.heartRate) recordNotes += `- Detak Jantung: ${appointment.heartRate} bpm\n`;
        if (appointment.respiratoryRate) recordNotes += `- Pernapasan: ${appointment.respiratoryRate}/menit\n`;
        if (appointment.bloodPressureSystolic && appointment.bloodPressureDiastolic) {
          recordNotes += `- Tekanan Darah: ${appointment.bloodPressureSystolic}/${appointment.bloodPressureDiastolic} mmHg\n`;
        }
        recordNotes += "\n";
      }
      if (appointment.physicalExamination) {
        recordNotes += `Pemeriksaan Fisik:\n${appointment.physicalExamination}\n\n`;
      }
      if (appointment.treatmentPlan) {
        recordNotes += `Rencana Pengobatan:\n${appointment.treatmentPlan}\n\n`;
      }
      if (appointment.notes) {
        recordNotes += `Catatan:\n${appointment.notes}`;
      }

      medicalRecordId = await ctx.db.insert("petMedicalRecords", {
        petId: appointment.petId,
        recordDate: appointment.appointmentDate,
        diagnosis: appointment.diagnosis,
        treatment: treatmentList.length > 0 ? treatmentList.join(", ") : undefined,
        prescription: prescriptionList.length > 0 ? prescriptionList.join("\n") : undefined,
        veterinarian,
        clinic,
        notes: recordNotes || undefined,
        createdBy: undefined,
      });
    }

    return {
      appointmentId: args.appointmentId,
      status: "Completed",
      totalAmount: appointment.totalAmount,
      paidAmount: actualPaidAmount,
      outstandingAmount,
      change:
        totalPayments > appointment.totalAmount
          ? totalPayments - appointment.totalAmount
          : 0,
      medicalRecordId,
    };
  },
});

// Cancel appointment
export const cancel = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    notes: v.optional(v.string()),
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed") {
      throw new Error(
        "Cannot cancel completed appointment - use refund process"
      );
    }

    await ctx.db.patch(args.appointmentId, {
      status: "Cancelled",
      notes: args.notes || appointment.notes,
      updatedBy: undefined,
    });

    return args.appointmentId;
  },
});

// Start clinical examination (Scheduled → InProgress)
export const startExamination = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    chiefComplaint: v.string(), // Required keluhan utama
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status !== "Scheduled") {
      throw new Error("Can only start examination for scheduled appointments");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "InProgress",
      chiefComplaint: args.chiefComplaint,
      updatedBy: undefined,
    });

    return args.appointmentId;
  },
});

// Update clinical examination data
export const updateClinicalData = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
    chiefComplaint: v.optional(v.string()),
    temperature: v.optional(v.number()),
    weight: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    respiratoryRate: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    physicalExamination: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    treatmentPlan: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const { appointmentId, ...clinicalData } = args;
    
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed" || appointment.status === "Cancelled") {
      throw new Error("Cannot update clinical data for completed/cancelled appointments");
    }

    await ctx.db.patch(appointmentId, {
      ...clinicalData,
      updatedBy: undefined,
    });

    return appointmentId;
  },
});

// Get clinical data for appointment
export const getClinicalData = query({
  args: { appointmentId: v.id("clinicAppointments") },
  returns: v.union(
    v.null(),
    v.object({
      chiefComplaint: v.optional(v.string()),
      temperature: v.optional(v.number()),
      weight: v.optional(v.number()),
      heartRate: v.optional(v.number()),
      respiratoryRate: v.optional(v.number()),
      bloodPressureSystolic: v.optional(v.number()),
      bloodPressureDiastolic: v.optional(v.number()),
      physicalExamination: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      treatmentPlan: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    return {
      chiefComplaint: appointment.chiefComplaint,
      temperature: appointment.temperature,
      weight: appointment.weight,
      heartRate: appointment.heartRate,
      respiratoryRate: appointment.respiratoryRate,
      bloodPressureSystolic: appointment.bloodPressureSystolic,
      bloodPressureDiastolic: appointment.bloodPressureDiastolic,
      physicalExamination: appointment.physicalExamination,
      diagnosis: appointment.diagnosis,
      treatmentPlan: appointment.treatmentPlan,
      notes: appointment.notes,
    };
  },
});

// List appointments
export const list = query({
  args: {
    status: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    staffId: v.optional(v.id("clinicStaff")),
    petId: v.optional(v.id("customerPets")),
    customerId: v.optional(v.id("customers")),
    appointmentDate: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let appointments;

    if (args.status) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.branchId) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .order("desc")
        .collect();
    } else if (args.staffId) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_staff", (q) => q.eq("staffId", args.staffId!))
        .order("desc")
        .collect();
    } else if (args.petId) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_pet", (q) => q.eq("petId", args.petId!))
        .order("desc")
        .collect();
    } else if (args.customerId) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .order("desc")
        .collect();
    } else if (args.appointmentDate) {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_appointment_date", (q) =>
          q.eq("appointmentDate", args.appointmentDate!)
        )
        .collect();
    } else {
      appointments = await ctx.db
        .query("clinicAppointments")
        .withIndex("by_appointment_date")
        .order("desc")
        .collect();
    }

    const filtered = appointments.filter((apt) => !apt.deletedAt);

    // Enrich with related data
    const enriched = await Promise.all(
      filtered.map(async (apt) => {
        const customer = await ctx.db.get(apt.customerId);
        const pet = await ctx.db.get(apt.petId);
        const staff = await ctx.db.get(apt.staffId);
        const branch = await ctx.db.get(apt.branchId);

        const services = await ctx.db
          .query("clinicAppointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", apt._id))
          .collect();

        return {
          ...apt,
          customer,
          pet,
          staff,
          branch,
          serviceCount: services.filter((s) => !s.deletedAt).length,
        };
      })
    );

    return enriched;
  },
});

// Get appointment by ID with full details
export const get = query({
  args: { id: v.id("clinicAppointments") },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);
    if (!appointment || appointment.deletedAt) return null;

    const customer = await ctx.db.get(appointment.customerId);
    const pet = await ctx.db.get(appointment.petId);
    const staff = await ctx.db.get(appointment.staffId);
    const branch = await ctx.db.get(appointment.branchId);

    // Get services with details
    const services = await ctx.db
      .query("clinicAppointmentServices")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.id))
      .collect();

    const enrichedServices = await Promise.all(
      services
        .filter((s) => !s.deletedAt)
        .map(async (service) => {
          const serviceData = await ctx.db.get(service.serviceId);
          let product = null;
          let variant = null;

          if (service.productId) {
            product = await ctx.db.get(service.productId);
          }
          if (service.variantId) {
            variant = await ctx.db.get(service.variantId);
          }

          return {
            ...service,
            service: serviceData,
            product,
            variant,
          };
        })
    );

    // Get payments
    const payments = await ctx.db
      .query("clinicPayments")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.id))
      .collect();

    return {
      ...appointment,
      customer,
      pet,
      staff,
      branch,
      services: enrichedServices,
      payments: payments.filter((p) => !p.deletedAt),
    };
  },
});

// Delete appointment (soft delete, only for cancelled)
export const remove = mutation({
  args: { id: v.id("clinicAppointments") },
  returns: v.id("clinicAppointments"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status === "Completed") {
      throw new Error("Cannot delete completed appointment");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return args.id;
  },
});

// Pickup prescription (reduces stock)
export const pickupPrescription = mutation({
  args: {
    serviceItemId: v.id("clinicAppointmentServices"),
  },
  returns: v.id("clinicAppointmentServices"),
  handler: async (ctx, args) => {
    const serviceItem = await ctx.db.get(args.serviceItemId);
    if (!serviceItem) throw new Error("Service item not found");
    if (!serviceItem.isPrescription)
      throw new Error("This is not a prescription item");
    if (serviceItem.prescriptionPickedUp)
      throw new Error("Prescription already picked up");

    const appointment = await ctx.db.get(serviceItem.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    if (!serviceItem.productId) {
      throw new Error("No product linked to this prescription");
    }

    // Reduce stock
    try {
      await reduceStockForSaleHelper(ctx, {
        branchId: appointment.branchId,
        productId: serviceItem.productId,
        variantId: serviceItem.variantId,
        quantity: serviceItem.quantity,
        saleId: serviceItem.appointmentId as any,
      });
    } catch (error: any) {
      const product = await ctx.db.get(serviceItem.productId);
      const productName = product?.name || "Unknown product";
      throw new Error(`${productName}: ${error.message}`);
    }

    // Mark as picked up
    await ctx.db.patch(args.serviceItemId, {
      prescriptionPickedUp: true,
      prescriptionPickupDate: Date.now(),
      updatedBy: undefined,
    });

    return args.serviceItemId;
  },
});
