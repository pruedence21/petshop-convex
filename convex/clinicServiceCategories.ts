import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create clinic service category
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.id("clinicServiceCategories"),
  handler: async (ctx, args) => {
    const categoryId = await ctx.db.insert("clinicServiceCategories", {
      code: args.code,
      name: args.name,
      description: args.description,
      icon: args.icon,
      color: args.color,
      isActive: true,
      createdBy: undefined,
    });
    return categoryId;
  },
});

// List clinic service categories
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicServiceCategories"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("clinicServiceCategories").collect();

    if (!args.includeInactive) {
      return categories.filter(
        (category) => category.isActive && !category.deletedAt
      );
    }

    return categories.filter((category) => !category.deletedAt);
  },
});

// Get clinic service category by ID
export const get = query({
  args: { id: v.id("clinicServiceCategories") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("clinicServiceCategories"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category || category.deletedAt) return null;
    return category;
  },
});

// Update clinic service category
export const update = mutation({
  args: {
    id: v.id("clinicServiceCategories"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("clinicServiceCategories"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Delete clinic service category (soft delete)
export const remove = mutation({
  args: { id: v.id("clinicServiceCategories") },
  returns: v.id("clinicServiceCategories"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Search clinic service categories by name
export const search = query({
  args: {
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicServiceCategories"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("clinicServiceCategories").collect();

    const filtered = categories.filter(
      (category) =>
        !category.deletedAt &&
        category.isActive &&
        (category.name.toLowerCase().includes(args.query.toLowerCase()) ||
          category.code.toLowerCase().includes(args.query.toLowerCase()))
    );

    return filtered;
  },
});
