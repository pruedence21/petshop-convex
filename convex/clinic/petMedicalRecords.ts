import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create pet medical record
export const create = mutation({
  args: {
    petId: v.id("customerPets"),
    recordDate: v.number(),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    prescription: v.optional(v.string()),
    veterinarian: v.optional(v.string()),
    clinic: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("petMedicalRecords"),
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("petMedicalRecords", {
      petId: args.petId,
      recordDate: args.recordDate,
      diagnosis: args.diagnosis,
      treatment: args.treatment,
      prescription: args.prescription,
      veterinarian: args.veterinarian,
      clinic: args.clinic,
      notes: args.notes,
      createdBy: undefined,
    });
    return recordId;
  },
});

// List medical records by pet
export const listByPet = query({
  args: {
    petId: v.id("customerPets"),
  },
  returns: v.array(
    v.object({
      _id: v.id("petMedicalRecords"),
      _creationTime: v.number(),
      petId: v.id("customerPets"),
      recordDate: v.number(),
      diagnosis: v.optional(v.string()),
      treatment: v.optional(v.string()),
      prescription: v.optional(v.string()),
      veterinarian: v.optional(v.string()),
      clinic: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("petMedicalRecords")
      .withIndex("by_pet", (q: any) => q.eq("petId", args.petId))
      .order("desc")
      .collect();

    return records.filter((record: any) => !record.deletedAt);
  },
});

// List all medical records (with optional pet filter)
export const list = query({
  args: {
    petId: v.optional(v.id("customerPets")),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let records;

    if (args.petId) {
      records = await ctx.db
        .query("petMedicalRecords")
        .withIndex("by_pet", (q: any) => q.eq("petId", args.petId))
        .order("desc")
        .collect();
    } else {
      records = await ctx.db
        .query("petMedicalRecords")
        .order("desc")
        .collect();
    }

    const activeRecords = records.filter((record: any) => !record.deletedAt);

    // Enrich with pet and customer data
    const enriched = await Promise.all(
      activeRecords.map(async (record: any) => {
        const pet = await ctx.db.get(record.petId);
        let customer = null;
        let species = null;

        if (pet && (pet as any).customerId) {
          customer = await ctx.db.get((pet as any).customerId);
          species = await ctx.db.get((pet as any).categoryId);
        }

        return {
          ...record,
          pet: pet ? {
            ...pet,
            species: (species as any)?.name,
          } : null,
          customer,
        };
      })
    );

    return enriched;
  },
});

// Get medical record by ID
export const get = query({
  args: { id: v.id("petMedicalRecords") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("petMedicalRecords"),
      _creationTime: v.number(),
      petId: v.id("customerPets"),
      recordDate: v.number(),
      diagnosis: v.optional(v.string()),
      treatment: v.optional(v.string()),
      prescription: v.optional(v.string()),
      veterinarian: v.optional(v.string()),
      clinic: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      pet: v.union(
        v.null(),
        v.object({
          _id: v.id("customerPets"),
          _creationTime: v.number(),
          customerId: v.id("customers"),
          name: v.string(),
          categoryId: v.id("animalCategories"),
          subcategoryId: v.optional(v.id("animalSubcategories")),
          breed: v.optional(v.string()),
          dateOfBirth: v.optional(v.number()),
          gender: v.optional(v.string()),
          weight: v.optional(v.number()),
          color: v.optional(v.string()),
          microchipNumber: v.optional(v.string()),
          notes: v.optional(v.string()),
          isActive: v.boolean(),
          createdBy: v.optional(v.id("users")),
          updatedBy: v.optional(v.id("users")),
          deletedAt: v.optional(v.number()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.deletedAt) return null;

    const pet = await ctx.db.get(record.petId);

    return {
      ...record,
      pet,
    };
  },
});

// Update medical record
export const update = mutation({
  args: {
    id: v.id("petMedicalRecords"),
    recordDate: v.optional(v.number()),
    diagnosis: v.optional(v.string()),
    treatment: v.optional(v.string()),
    prescription: v.optional(v.string()),
    veterinarian: v.optional(v.string()),
    clinic: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("petMedicalRecords"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
    });

    return id;
  },
});

// Delete medical record (soft delete)
export const remove = mutation({
  args: { id: v.id("petMedicalRecords") },
  returns: v.id("petMedicalRecords"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
    });
    return args.id;
  },
});

// Create medical record from completed appointment
export const createFromAppointment = mutation({
  args: {
    appointmentId: v.id("clinicAppointments"),
  },
  returns: v.id("petMedicalRecords"),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.status !== "Completed")
      throw new Error("Can only create medical record from completed appointment");

    // Get appointment services to extract diagnosis/treatment
    const services = await ctx.db
      .query("clinicAppointmentServices")
      .withIndex("by_appointment", (q: any) => q.eq("appointmentId", args.appointmentId))
      .collect();

    const activeServices = services.filter((s: any) => !s.deletedAt);

    // Aggregate notes as diagnosis/treatment
    const diagnosisList: string[] = [];
    const treatmentList: string[] = [];
    const prescriptionList: string[] = [];

    for (const service of activeServices) {
      const serviceData = await ctx.db.get(service.serviceId);
      if (serviceData) {
        treatmentList.push(`${serviceData.name} (${service.quantity}x)`);
      }

      if (service.notes) {
        diagnosisList.push(service.notes);
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

    // Get staff name
    const staff = await ctx.db.get(appointment.staffId);
    const veterinarian = staff?.name || "Unknown";

    // Get branch name
    const branch = await ctx.db.get(appointment.branchId);
    const clinic = branch?.name || "Unknown";

    const recordId = await ctx.db.insert("petMedicalRecords", {
      petId: appointment.petId,
      recordDate: appointment.appointmentDate,
      diagnosis: diagnosisList.length > 0 ? diagnosisList.join("; ") : undefined,
      treatment: treatmentList.length > 0 ? treatmentList.join(", ") : undefined,
      prescription: prescriptionList.length > 0 ? prescriptionList.join("\n") : undefined,
      veterinarian,
      clinic,
      notes: appointment.notes,
      createdBy: undefined,
    });

    return recordId;
  },
});



