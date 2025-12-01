import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { buildError } from "../../lib/errors";

// Create product
// Create product
export const create = mutation({
  args: {
    sku: v.optional(v.string()), // Optional, auto-generated if empty
    barcode: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("productCategories"),
    subcategoryId: v.optional(v.id("productSubcategories")),
    brandId: v.id("brands"),
    unitId: v.id("units"),
    purchasePrice: v.number(),
    sellingPrice: v.number(),
    minStock: v.number(),
    maxStock: v.number(),
    hasVariants: v.boolean(),
    hasExpiry: v.optional(v.boolean()),
    type: v.optional(v.string()), // "product" or "service"
    serviceDuration: v.optional(v.number()), // For services
  },
  handler: async (ctx, args) => {
    let sku = args.sku;

    // Auto-generate SKU if not provided
    if (!sku) {
      const type = args.type || "product";
      let prefix = "PRD";
      if (type === "medicine") prefix = "MED";
      else if (type === "procedure") prefix = "PRC";
      else if (type === "service") prefix = "SVC";

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fullPrefix = `${prefix}-${dateStr}-`;

      // Find last SKU with this prefix
      const lastProduct = await ctx.db
        .query("products")
        .withIndex("by_sku")
        .filter((q) => q.gte(q.field("sku"), fullPrefix) && q.lt(q.field("sku"), fullPrefix + "\uffff"))
        .order("desc")
        .first();

      let nextNum = 1;
      if (lastProduct && lastProduct.sku.startsWith(fullPrefix)) {
        const parts = lastProduct.sku.split("-");
        if (parts.length === 3) {
          nextNum = parseInt(parts[2], 10) + 1;
        }
      }

      sku = `${fullPrefix}${String(nextNum).padStart(3, "0")}`;
    }

    // Uniqueness check for SKU using index
    const existing = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", sku!))
      .unique();
    if (existing) {
      // Throw structured error code for UI mapping
      throw new Error(JSON.stringify(buildError({ code: "SKU_EXISTS", message: "SKU already exists" })));
    }

    // Check barcode uniqueness if provided
    if (args.barcode) {
      const existingBarcode = await ctx.db
        .query("products")
        .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode!))
        .unique();
      if (existingBarcode) {
        throw new Error(JSON.stringify(buildError({ code: "BARCODE_EXISTS", message: "Barcode already exists" })));
      }
    }

    const productId = await ctx.db.insert("products", {
      sku: sku!,
      barcode: args.barcode,
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      subcategoryId: args.subcategoryId,
      brandId: args.brandId,
      unitId: args.unitId,
      purchasePrice: args.purchasePrice,
      sellingPrice: args.sellingPrice,
      minStock: args.minStock,
      maxStock: args.maxStock,
      hasVariants: args.hasVariants,
      hasExpiry: args.hasExpiry || false,
      type: args.type || "product",
      serviceDuration: args.serviceDuration,
      isActive: true,
      createdBy: undefined,
    });
    return productId;
  },
});

// List products
export const list = query({
  args: {
    categoryId: v.optional(v.id("productCategories")),
    brandId: v.optional(v.id("brands")),
    type: v.optional(v.string()), // Filter by "product" or "service"
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let products;

    if (args.type) {
      products = await ctx.db
        .query("products")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else if (args.categoryId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) =>
          q.eq("categoryId", args.categoryId!)
        )
        .collect();
    } else if (args.brandId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_brand", (q) =>
          q.eq("brandId", args.brandId!)
        )
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }

    if (!args.includeInactive) {
      return products.filter(product => product.isActive && !product.deletedAt);
    }

    return products.filter(product => !product.deletedAt);
  },
});

// Get product by ID with related data
export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const brand = await ctx.db.get(product.brandId);
    const unit = await ctx.db.get(product.unitId);

    let subcategory = null;
    if (product.subcategoryId) {
      subcategory = await ctx.db.get(product.subcategoryId);
    }

    return {
      ...product,
      category,
      subcategory,
      brand,
      unit,
    };
  },
});

// Update product
export const update = mutation({
  args: {
    id: v.id("products"),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    subcategoryId: v.optional(v.id("productSubcategories")),
    brandId: v.optional(v.id("brands")),
    unitId: v.optional(v.id("units")),
    purchasePrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    minStock: v.optional(v.number()),
    maxStock: v.optional(v.number()),
    hasVariants: v.optional(v.boolean()),
    hasExpiry: v.optional(v.boolean()),
    type: v.optional(v.string()),
    serviceDuration: v.optional(v.number()),
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

// Delete product (soft delete)
export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });
    return args.id;
  },
});

// Get product variants by product ID
export const getVariants = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return variants.filter(v => v.isActive && !v.deletedAt);
  },
});



