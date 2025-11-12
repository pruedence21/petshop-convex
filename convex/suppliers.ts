import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create supplier
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    paymentTerms: v.string(),
    rating: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supplierId = await ctx.db.insert("suppliers", {
      code: args.code,
      name: args.name,
      contactPerson: args.contactPerson,
      phone: args.phone,
      email: args.email,
      address: args.address,
      city: args.city,
      province: args.province,
      postalCode: args.postalCode,
      paymentTerms: args.paymentTerms,
      rating: args.rating,
      notes: args.notes,
      isActive: true,
      createdBy: undefined,
    });
    return supplierId;
  },
});

// List suppliers
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const suppliers = await ctx.db.query("suppliers").collect();
    
    if (!args.includeInactive) {
      return suppliers.filter(supplier => supplier.isActive && !supplier.deletedAt);
    }
    
    return suppliers.filter(supplier => !supplier.deletedAt);
  },
});

// Get supplier by ID
export const get = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update supplier
export const update = mutation({
  args: {
    id: v.id("suppliers"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    paymentTerms: v.optional(v.string()),
    rating: v.optional(v.number()),
    notes: v.optional(v.string()),
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

// Delete supplier (soft delete)
export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});
