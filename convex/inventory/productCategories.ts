import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create category
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("productCategories", {
      code: args.code,
      name: args.name,
      description: args.description,
      icon: args.icon,
      isActive: true,
      createdBy: undefined,
    });
    return categoryId;
  },
});

// List product categories
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("productCategories").collect();

    if (!args.includeInactive) {
      return categories.filter(cat => cat.isActive && !cat.deletedAt);
    }

    return categories.filter(cat => !cat.deletedAt);
  },
});

// Get category by ID
export const get = query({
  args: { id: v.id("productCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update category
export const update = mutation({
  args: {
    id: v.id("productCategories"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
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

// Delete category (soft delete)
export const remove = mutation({
  args: { id: v.id("productCategories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});



