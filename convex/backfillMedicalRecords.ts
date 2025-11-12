import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Backfill medical records from completed appointments
export const backfillFromCompletedAppointments = mutation({
  args: {},
  returns: v.object({
    message: v.string(),
    processed: v.number(),
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    // Get all completed appointments
    const appointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_status", (q) => q.eq("status", "Completed"))
      .collect();

    const activeAppointments = appointments.filter((apt) => !apt.deletedAt);

    let processed = 0;
    let created = 0;
    let skipped = 0;

    for (const appointment of activeAppointments) {
      processed++;

      // Check if medical record already exists for this appointment
      const existingRecords = await ctx.db
        .query("petMedicalRecords")
        .collect();

      const hasRecord = existingRecords.some(
        (record) =>
          record.petId === appointment.petId &&
          record.recordDate === appointment.appointmentDate &&
          !record.deletedAt
      );

      if (hasRecord) {
        skipped++;
        continue;
      }

      // Get appointment services
      const services = await ctx.db
        .query("clinicAppointmentServices")
        .withIndex("by_appointment", (q: any) =>
          q.eq("appointmentId", appointment._id)
        )
        .collect();

      const activeServices = services.filter((s: any) => !s.deletedAt);

      // Aggregate treatment and prescription
      const treatmentList: string[] = [];
      const prescriptionList: string[] = [];

      for (const service of activeServices) {
        const serviceData = await ctx.db.get(service.serviceId);
        if (serviceData) {
          treatmentList.push(`${(serviceData as any).name} (${service.quantity}x)`);
        }

        if (service.isPrescription && service.productId) {
          const product = await ctx.db.get(service.productId);
          let prescriptionText = (product as any)?.name || "Unknown";
          if (service.variantId) {
            const variant = await ctx.db.get(service.variantId);
            prescriptionText += variant ? ` ${(variant as any).variantValue}` : "";
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
      const veterinarian = (staff as any)?.name || "Unknown";

      const branch = await ctx.db.get(appointment.branchId);
      const clinic = (branch as any)?.name || "Unknown";

      // Build comprehensive medical record
      let recordNotes = "";
      if (appointment.chiefComplaint) {
        recordNotes += `Keluhan: ${appointment.chiefComplaint}\n\n`;
      }
      if (
        appointment.temperature ||
        appointment.weight ||
        appointment.heartRate
      ) {
        recordNotes += "Vital Signs:\n";
        if (appointment.temperature)
          recordNotes += `- Suhu: ${appointment.temperature}°C\n`;
        if (appointment.weight)
          recordNotes += `- Berat: ${appointment.weight} kg\n`;
        if (appointment.heartRate)
          recordNotes += `- Detak Jantung: ${appointment.heartRate} bpm\n`;
        if (appointment.respiratoryRate)
          recordNotes += `- Pernapasan: ${appointment.respiratoryRate}/menit\n`;
        if (
          appointment.bloodPressureSystolic &&
          appointment.bloodPressureDiastolic
        ) {
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

      // Create medical record
      await ctx.db.insert("petMedicalRecords", {
        petId: appointment.petId,
        recordDate: appointment.appointmentDate,
        diagnosis: appointment.diagnosis,
        treatment:
          treatmentList.length > 0 ? treatmentList.join(", ") : undefined,
        prescription:
          prescriptionList.length > 0
            ? prescriptionList.join("\n")
            : undefined,
        veterinarian,
        clinic,
        notes: recordNotes || undefined,
        createdBy: undefined,
      });

      created++;
    }

    return {
      message: `Backfill completed: ${created} medical records created, ${skipped} skipped (already exists)`,
      processed,
      created,
      skipped,
    };
  },
});
