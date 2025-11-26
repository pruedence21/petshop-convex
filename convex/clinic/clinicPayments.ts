import { query } from "../_generated/server";
import { v } from "convex/values";

// List payments for appointment
export const list = query({
  args: { appointmentId: v.id("clinicAppointments") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("clinicPayments")
      .withIndex("by_appointment", (q: any) => q.eq("appointmentId", args.appointmentId))
      .order("desc")
      .collect();

    return payments.filter((p: any) => !p.deletedAt);
  },
});



