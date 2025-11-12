import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create animal category
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("animalCategories", {
      name: args.name,
      description: args.description,
      icon: args.icon,
      isActive: true,
      createdBy: undefined, // TODO: Get from auth
    });
    return categoryId;
  },
});

// List all animal categories
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("animalCategories").collect();
    
    if (!args.includeInactive) {
      return categories.filter(cat => cat.isActive && !cat.deletedAt);
    }
    
    return categories.filter(cat => !cat.deletedAt);
  },
});

// Get category by ID
export const get = query({
  args: { id: v.id("animalCategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update animal category
export const update = mutation({
  args: {
    id: v.id("animalCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined, // TODO: Get from auth
    });
    
    return id;
  },
});

// Delete animal category (soft delete)
export const remove = mutation({
  args: { id: v.id("animalCategories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: Get from auth
    });
    return args.id;
  },
});
