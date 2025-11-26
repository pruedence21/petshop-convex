import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create pet
export const create = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.string(),
    categoryId: v.id("animalCategories"),
    subcategoryId: v.optional(v.id("animalSubcategories")),
    breed: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()),
    weight: v.optional(v.number()),
    color: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const petId = await ctx.db.insert("customerPets", {
      customerId: args.customerId,
      name: args.name,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      breed: args.breed,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      weight: args.weight,
      color: args.color,
      microchipNumber: args.microchipNumber,
      notes: args.notes,
      isActive: true,
      createdBy: undefined,
    });
    return petId;
  },
});

// List pets
export const list = query({
  args: {
    customerId: v.optional(v.id("customers")),
    categoryId: v.optional(v.id("animalCategories")),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let pets;

    if (args.customerId) {
      pets = await ctx.db
        .query("customerPets")
        .withIndex("by_customer", (q) =>
          q.eq("customerId", args.customerId!)
        )
        .collect();
    } else if (args.categoryId) {
      pets = await ctx.db
        .query("customerPets")
        .withIndex("by_category", (q) =>
          q.eq("categoryId", args.categoryId!)
        )
        .collect();
    } else {
      pets = await ctx.db.query("customerPets").collect();
    }

    if (!args.includeInactive) {
      return pets.filter(pet => pet.isActive && !pet.deletedAt);
    }

    return pets.filter(pet => !pet.deletedAt);
  },
});

// Get pet by ID
export const get = query({
  args: { id: v.id("customerPets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update pet
export const update = mutation({
  args: {
    id: v.id("customerPets"),
    customerId: v.optional(v.id("customers")),
    name: v.optional(v.string()),
    categoryId: v.optional(v.id("animalCategories")),
    subcategoryId: v.optional(v.id("animalSubcategories")),
    breed: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    gender: v.optional(v.string()),
    weight: v.optional(v.number()),
    color: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
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

// Delete pet (soft delete)
export const remove = mutation({
  args: { id: v.id("customerPets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});



