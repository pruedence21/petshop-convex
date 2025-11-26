import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isBase: v.boolean(),
  },
  handler: async (ctx, args) => {
    const unitId = await ctx.db.insert("units", {
      code: args.code,
      name: args.name,
      description: args.description,
      isBase: args.isBase,
      isActive: true,
      createdBy: undefined,
    });
    return unitId;
  },
});

// List units
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const units = await ctx.db.query("units").collect();

    if (!args.includeInactive) {
      return units.filter(unit => unit.isActive && !unit.deletedAt);
    }

    return units.filter(unit => !unit.deletedAt);
  },
});

// Get unit by ID
export const get = query({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update unit
export const update = mutation({
  args: {
    id: v.id("units"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isBase: v.optional(v.boolean()),
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

// Delete unit (soft delete)
export const remove = mutation({
  args: { id: v.id("units") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});



