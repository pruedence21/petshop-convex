import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create variant
export const create = mutation({
  args: {
    productId: v.id("products"),
    variantName: v.string(),
    variantValue: v.string(),
    sku: v.string(),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if SKU already exists (excluding soft-deleted ones)
    const allVariantsWithSku = await ctx.db
      .query("productVariants")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .collect();

    const existingActiveVariant = allVariantsWithSku.find(v => !v.deletedAt);

    if (existingActiveVariant) {
      throw new Error("SKU varian sudah digunakan");
    }

    const variantId = await ctx.db.insert("productVariants", {
      productId: args.productId,
      variantName: args.variantName,
      variantValue: args.variantValue,
      sku: args.sku,
      purchasePrice: args.purchasePrice,
      sellingPrice: args.sellingPrice,
      isActive: true,
      createdBy: undefined,
    });
    return variantId;
  },
});

// List variants by product ID
export const listByProduct = query({
  args: {
    productId: v.id("products"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    if (!args.includeInactive) {
      return variants.filter(v => v.isActive && !v.deletedAt);
    }

    return variants.filter(v => !v.deletedAt);
  },
});

// Get variant by ID
export const get = query({
  args: { id: v.id("productVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.id);
    if (!variant) return null;

    const product = await ctx.db.get(variant.productId);

    return {
      ...variant,
      product,
    };
  },
});

// Update variant
export const update = mutation({
  args: {
    id: v.id("productVariants"),
    variantName: v.optional(v.string()),
    variantValue: v.optional(v.string()),
    sku: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // If updating SKU, check for duplicates
    if (updates.sku) {
      const allVariantsWithSku = await ctx.db
        .query("productVariants")
        .withIndex("by_sku", (q) => q.eq("sku", updates.sku!))
        .collect();

      const existingActiveVariant = allVariantsWithSku.find(
        v => v._id !== id && !v.deletedAt
      );

      if (existingActiveVariant) {
        throw new Error("SKU varian sudah digunakan");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Delete variant (soft delete)
export const remove = mutation({
  args: { id: v.id("productVariants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Check if product has variants
export const hasVariants = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return variants.filter(v => v.isActive && !v.deletedAt).length > 0;
  },
});

// Get variant stock across all branches
export const getVariantStock = query({
  args: { variantId: v.id("productVariants") },
  handler: async (ctx, args) => {
    const stocks = await ctx.db
      .query("productStock")
      .withIndex("by_variant", (q) => q.eq("variantId", args.variantId))
      .collect();

    // Get branch details
    const stocksWithBranch = await Promise.all(
      stocks.map(async (stock) => {
        const branch = await ctx.db.get(stock.branchId);
        return {
          ...stock,
          branch,
        };
      })
    );

    return stocksWithBranch;
  },
});



