import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { reduceStockForSaleHelper } from "../inventory/productStock";
import { createPrescriptionJournalEntry } from "../finance/accountingHelpers";

// Get prescription queue (Completed appointments with unfulfilled prescriptions)
export const getPrescriptionQueue = query({
    args: {
        branchId: v.optional(v.id("branches")),
    },
    returns: v.array(v.any()),
    handler: async (ctx, args) => {
        let appointments;

        if (args.branchId) {
            appointments = await ctx.db
                .query("clinicAppointments")
                .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
                .filter((q) => q.eq(q.field("status"), "Completed"))
                .collect();
        } else {
            appointments = await ctx.db
                .query("clinicAppointments")
                .withIndex("by_status", (q) => q.eq("status", "Completed"))
                .collect();
        }

        // Filter appointments that have unfulfilled prescriptions
        const queue = await Promise.all(
            appointments.map(async (apt) => {
                const services = await ctx.db
                    .query("clinicAppointmentServices")
                    .withIndex("by_appointment", (q) => q.eq("appointmentId", apt._id))
                    .collect();

                const prescriptions = services.filter(
                    (s) => s.isPrescription && !s.prescriptionPickedUp && !s.deletedAt
                );

                if (prescriptions.length === 0) return null;

                // Enrich with patient and prescription details
                const patient = await ctx.db.get(apt.petId);
                const customer = await ctx.db.get(apt.customerId);
                const staff = await ctx.db.get(apt.staffId);

                const enrichedPrescriptions = await Promise.all(
                    prescriptions.map(async (p) => {
                        const product = p.productId ? await ctx.db.get(p.productId) : null;
                        const variant = p.variantId ? await ctx.db.get(p.variantId) : null;
                        return {
                            ...p,
                            productName: product?.name || "Unknown",
                            variantName: variant?.variantValue || "",
                        };
                    })
                );

                return {
                    appointment: apt,
                    patient: patient?.name || "Unknown",
                    customer: customer?.name || "Unknown",
                    doctor: staff?.name || "Unknown",
                    prescriptions: enrichedPrescriptions,
                };
            })
        );

        return queue.filter((item) => item !== null);
    },
});

// Dispense prescription (Reduce stock + Create Journal)
export const dispensePrescription = mutation({
    args: {
        appointmentId: v.id("clinicAppointments"),
        itemIds: v.optional(v.array(v.id("clinicAppointmentServices"))), // Optional: specific items to dispense
    },
    returns: v.object({
        success: v.boolean(),
        journalEntryId: v.optional(v.id("journalEntries")),
    }),
    handler: async (ctx, args) => {
        const appointment = await ctx.db.get(args.appointmentId);
        if (!appointment) throw new Error("Appointment not found");

        // Get prescription items
        const services = await ctx.db
            .query("clinicAppointmentServices")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .collect();

        let itemsToDispense = services.filter(
            (s) => s.isPrescription && !s.prescriptionPickedUp && !s.deletedAt
        );

        // Filter by specific itemIds if provided
        if (args.itemIds && args.itemIds.length > 0) {
            itemsToDispense = itemsToDispense.filter((s) =>
                args.itemIds!.includes(s._id)
            );
        }

        if (itemsToDispense.length === 0) {
            throw new Error("No prescriptions to dispense");
        }

        const dispensedItemsForJournal: Array<{
            productName: string;
            cogs: number;
            category: string;
        }> = [];

        const now = Date.now();

        // Process each item
        for (const item of itemsToDispense) {
            if (!item.productId) continue;

            // 1. Reduce Stock
            try {
                await reduceStockForSaleHelper(ctx, {
                    branchId: appointment.branchId,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    saleId: appointment._id as any, // Reference appointment
                });
            } catch (error: any) {
                throw new Error(`Stock error for item ${item._id}: ${error.message}`);
            }

            // 2. Calculate COGS for Journal
            // We need to fetch the stock again or estimate COGS.
            // Ideally reduceStockForSaleHelper returns COGS, but it might not.
            // Let's fetch averageCost from productStock.
            const stockQuery = ctx.db
                .query("productStock")
                .withIndex("by_branch_product", (q) =>
                    q.eq("branchId", appointment.branchId).eq("productId", item.productId!)
                );

            const stocks = await stockQuery.collect();
            let stock = null;
            if (item.variantId) {
                stock = stocks.find(s => s.variantId === item.variantId);
            } else {
                stock = stocks.find(s => !s.variantId);
            }

            const avgCost = stock?.averageCost || 0;
            const cogs = avgCost * item.quantity;

            const product = await ctx.db.get(item.productId);

            dispensedItemsForJournal.push({
                productName: product?.name || "Unknown",
                cogs,
                category: "Medicine", // Default category for prescriptions
            });

            // 3. Update Item Status
            await ctx.db.patch(item._id, {
                prescriptionPickedUp: true,
                prescriptionPickupDate: now,
                updatedBy: undefined,
            });
        }

        // 4. Create Journal Entry
        let journalEntryId = undefined;
        if (dispensedItemsForJournal.length > 0) {
            journalEntryId = await createPrescriptionJournalEntry(ctx, {
                appointmentId: appointment._id,
                appointmentNumber: appointment.appointmentNumber,
                dispenseDate: now,
                branchId: appointment.branchId,
                items: dispensedItemsForJournal,
            });
        }

        return { success: true, journalEntryId };
    },
});
