import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create branch
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const branchId = await ctx.db.insert("branches", {
      code: args.code,
      name: args.name,
      address: args.address,
      city: args.city,
      province: args.province,
      postalCode: args.postalCode,
      phone: args.phone,
      email: args.email,
      isActive: true,
      createdBy: undefined,
    });
    return branchId;
  },
});

// List branches
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const branches = await ctx.db.query("branches").collect();
    
    if (!args.includeInactive) {
      return branches.filter(branch => branch.isActive && !branch.deletedAt);
    }
    
    return branches.filter(branch => !branch.deletedAt);
  },
});

// Get branch by ID
export const get = query({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update branch
export const update = mutation({
  args: {
    id: v.id("branches"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
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

// Delete branch (soft delete)
export const remove = mutation({
  args: { id: v.id("branches") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});
