import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create customer
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customerId = await ctx.db.insert("customers", {
      code: args.code,
      name: args.name,
      phone: args.phone,
      email: args.email,
      address: args.address,
      city: args.city,
      province: args.province,
      postalCode: args.postalCode,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      idNumber: args.idNumber,
      notes: args.notes,
      isActive: true,
      createdBy: undefined,
    });
    return customerId;
  },
});

// List customers
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db.query("customers").collect();
    
    if (!args.includeInactive) {
      return customers.filter(customer => customer.isActive && !customer.deletedAt);
    }
    
    return customers.filter(customer => !customer.deletedAt);
  },
});

// Get customer by ID
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update customer
export const update = mutation({
  args: {
    id: v.id("customers"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()),
    idNumber: v.optional(v.string()),
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

// Delete customer (soft delete)
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Get or create default "UMUM" customer for walk-in sales
export const getOrCreateDefault = query({
  args: {},
  handler: async (ctx) => {
    // Look for customer with code "UMUM"
    const customers = await ctx.db
      .query("customers")
      .collect();
    
    const umumCustomer = customers.find(
      c => c.code === "UMUM" && !c.deletedAt
    );
    
    return umumCustomer || null;
  },
});

// Search customers by name or phone
export const search = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db.query("customers").collect();
    
    const searchLower = args.query.toLowerCase();
    
    return customers.filter(
      c => !c.deletedAt && 
      c.isActive && 
      (c.name.toLowerCase().includes(searchLower) || 
       c.phone.includes(args.query) ||
       c.code.toLowerCase().includes(searchLower))
    );
  },
});

// Create default UMUM customer (for initial setup)
export const createDefaultCustomer = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if UMUM customer already exists
    const customers = await ctx.db.query("customers").collect();
    const existing = customers.find(c => c.code === "UMUM" && !c.deletedAt);
    
    if (existing) {
      return { id: existing._id, message: "UMUM customer already exists" };
    }

    // Create UMUM customer
    const customerId = await ctx.db.insert("customers", {
      code: "UMUM",
      name: "UMUM (Walk-in Customer)",
      phone: "-",
      email: undefined,
      address: undefined,
      city: undefined,
      province: undefined,
      postalCode: undefined,
      dateOfBirth: undefined,
      gender: undefined,
      idNumber: undefined,
      notes: "Default customer untuk penjualan tanpa identitas pelanggan",
      isActive: true,
      createdBy: undefined,
    });

    return { id: customerId, message: "UMUM customer created successfully" };
  },
});
