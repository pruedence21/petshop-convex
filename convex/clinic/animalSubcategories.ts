import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create animal subcategory
export const create = mutation({
  args: {
    categoryId: v.id("animalCategories"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subcategoryId = await ctx.db.insert("animalSubcategories", {
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      isActive: true,
      createdBy: undefined,
    });
    return subcategoryId;
  },
});

// List subcategories
export const list = query({
  args: {
    categoryId: v.optional(v.id("animalCategories")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let subcategories;

    if (args.categoryId) {
      subcategories = await ctx.db
        .query("animalSubcategories")
        .withIndex("by_category", (q) =>
          q.eq("categoryId", args.categoryId!)
        )
        .collect();
    } else {
      subcategories = await ctx.db.query("animalSubcategories").collect();
    }

    if (!args.includeInactive) {
      return subcategories.filter(sub => sub.isActive && !sub.deletedAt);
    }

    return subcategories.filter(sub => !sub.deletedAt);
  },
});

// Get subcategory by ID
export const get = query({
  args: { id: v.id("animalSubcategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update subcategory
export const update = mutation({
  args: {
    id: v.id("animalSubcategories"),
    categoryId: v.optional(v.id("animalCategories")),
    name: v.optional(v.string()),
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

// Delete subcategory (soft delete)
export const remove = mutation({
  args: { id: v.id("animalSubcategories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});



