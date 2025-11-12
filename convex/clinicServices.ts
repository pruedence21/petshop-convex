import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create clinic service
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("clinicServiceCategories"),
    basePrice: v.number(),
    duration: v.number(),
    requiresInventory: v.boolean(),
  },
  returns: v.id("clinicServices"),
  handler: async (ctx, args) => {
    const serviceId = await ctx.db.insert("clinicServices", {
      code: args.code,
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      basePrice: args.basePrice,
      duration: args.duration,
      requiresInventory: args.requiresInventory,
      isActive: true,
      createdBy: undefined,
    });
    return serviceId;
  },
});

// List clinic services
export const list = query({
  args: {
    categoryId: v.optional(v.id("clinicServiceCategories")),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicServices"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      categoryId: v.id("clinicServiceCategories"),
      basePrice: v.number(),
      duration: v.number(),
      requiresInventory: v.boolean(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      category: v.union(
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
    })
  ),
  handler: async (ctx, args) => {
    let services;

    if (args.categoryId) {
      services = await ctx.db
        .query("clinicServices")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    } else {
      services = await ctx.db.query("clinicServices").collect();
    }

    // Filter based on includeInactive
    const filtered = !args.includeInactive
      ? services.filter((service) => service.isActive && !service.deletedAt)
      : services.filter((service) => !service.deletedAt);

    // Enrich with category details
    const enriched = await Promise.all(
      filtered.map(async (service) => {
        const category = await ctx.db.get(service.categoryId);
        return {
          ...service,
          category,
        };
      })
    );

    return enriched;
  },
});

// Get clinic service by ID with category
export const get = query({
  args: { id: v.id("clinicServices") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("clinicServices"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      categoryId: v.id("clinicServiceCategories"),
      basePrice: v.number(),
      duration: v.number(),
      requiresInventory: v.boolean(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      category: v.union(
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
    })
  ),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.id);
    if (!service || service.deletedAt) return null;

    const category = await ctx.db.get(service.categoryId);

    return {
      ...service,
      category,
    };
  },
});

// Update clinic service
export const update = mutation({
  args: {
    id: v.id("clinicServices"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("clinicServiceCategories")),
    basePrice: v.optional(v.number()),
    duration: v.optional(v.number()),
    requiresInventory: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("clinicServices"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Delete clinic service (soft delete)
export const remove = mutation({
  args: { id: v.id("clinicServices") },
  returns: v.id("clinicServices"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Search clinic services by name or code
export const search = query({
  args: {
    query: v.string(),
    categoryId: v.optional(v.id("clinicServiceCategories")),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicServices"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      categoryId: v.id("clinicServiceCategories"),
      basePrice: v.number(),
      duration: v.number(),
      requiresInventory: v.boolean(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      category: v.union(
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
    })
  ),
  handler: async (ctx, args) => {
    let services;

    if (args.categoryId) {
      services = await ctx.db
        .query("clinicServices")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .collect();
    } else {
      services = await ctx.db.query("clinicServices").collect();
    }

    const filtered = services.filter(
      (service) =>
        !service.deletedAt &&
        service.isActive &&
        (service.name.toLowerCase().includes(args.query.toLowerCase()) ||
          service.code.toLowerCase().includes(args.query.toLowerCase()))
    );

    // Enrich with category details
    const enriched = await Promise.all(
      filtered.map(async (service) => {
        const category = await ctx.db.get(service.categoryId);
        return {
          ...service,
          category,
        };
      })
    );

    return enriched;
  },
});
