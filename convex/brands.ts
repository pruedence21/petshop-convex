import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create brand
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const brandId = await ctx.db.insert("brands", {
      code: args.code,
      name: args.name,
      description: args.description,
      logo: args.logo,
      contactPerson: args.contactPerson,
      phone: args.phone,
      email: args.email,
      website: args.website,
      isActive: true,
      createdBy: undefined,
    });
    return brandId;
  },
});

// List brands
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const brands = await ctx.db.query("brands").collect();
    
    if (!args.includeInactive) {
      return brands.filter(brand => brand.isActive && !brand.deletedAt);
    }
    
    return brands.filter(brand => !brand.deletedAt);
  },
});

// Get brand by ID
export const get = query({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update brand
export const update = mutation({
  args: {
    id: v.id("brands"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
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

// Delete brand (soft delete)
export const remove = mutation({
  args: { id: v.id("brands") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});
