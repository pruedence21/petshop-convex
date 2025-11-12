import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create product subcategory
export const create = mutation({
  args: {
    categoryId: v.id("productCategories"),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subcategoryId = await ctx.db.insert("productSubcategories", {
      categoryId: args.categoryId,
      code: args.code,
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
    categoryId: v.optional(v.id("productCategories")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let subcategories;
    
    if (args.categoryId) {
      subcategories = await ctx.db
        .query("productSubcategories")
        .withIndex("by_category", (q) => 
          q.eq("categoryId", args.categoryId!)
        )
        .collect();
    } else {
      subcategories = await ctx.db.query("productSubcategories").collect();
    }
    
    if (!args.includeInactive) {
      return subcategories.filter(sub => sub.isActive && !sub.deletedAt);
    }
    
    return subcategories.filter(sub => !sub.deletedAt);
  },
});

// Get subcategory by ID
export const get = query({
  args: { id: v.id("productSubcategories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update subcategory
export const update = mutation({
  args: {
    id: v.id("productSubcategories"),
    categoryId: v.optional(v.id("productCategories")),
    code: v.optional(v.string()),
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
  args: { id: v.id("productSubcategories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});
