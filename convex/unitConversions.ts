import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create unit conversion
export const create = mutation({
  args: {
    fromUnitId: v.id("units"),
    toUnitId: v.id("units"),
    conversionFactor: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversionId = await ctx.db.insert("unitConversions", {
      fromUnitId: args.fromUnitId,
      toUnitId: args.toUnitId,
      conversionFactor: args.conversionFactor,
      description: args.description,
      isActive: true,
      createdBy: undefined,
    });
    return conversionId;
  },
});

// List conversions
export const list = query({
  args: {
    fromUnitId: v.optional(v.id("units")),
    toUnitId: v.optional(v.id("units")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let conversions;
    
    if (args.fromUnitId) {
      conversions = await ctx.db
        .query("unitConversions")
        .withIndex("by_from_unit", (q) => q.eq("fromUnitId", args.fromUnitId!))
        .collect();
    } else if (args.toUnitId) {
      conversions = await ctx.db
        .query("unitConversions")
        .withIndex("by_to_unit", (q) => q.eq("toUnitId", args.toUnitId!))
        .collect();
    } else {
      conversions = await ctx.db.query("unitConversions").collect();
    }
    
    if (!args.includeInactive) {
      return conversions.filter(conv => conv.isActive && !conv.deletedAt);
    }
    
    return conversions.filter(conv => !conv.deletedAt);
  },
});

// Get conversion by ID
export const get = query({
  args: { id: v.id("unitConversions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update conversion
export const update = mutation({
  args: {
    id: v.id("unitConversions"),
    fromUnitId: v.optional(v.id("units")),
    toUnitId: v.optional(v.id("units")),
    conversionFactor: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });
    
    return id;
  },
});

// Delete conversion (soft delete)
export const remove = mutation({
  args: { id: v.id("unitConversions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});
