import { query } from "./_generated/server";
import { v } from "convex/values";

// List stock movements by branch
export const listByBranch = query({
  args: {
    branchId: v.id("branches"),
    movementType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
      .order("desc")
      .collect();

    // Filter by movement type
    if (args.movementType) {
      movements = movements.filter((m) => m.movementType === args.movementType);
    }

    // Filter by date range
    if (args.startDate) {
      movements = movements.filter((m) => m.movementDate >= args.startDate!);
    }
    if (args.endDate) {
      movements = movements.filter((m) => m.movementDate <= args.endDate!);
    }

    // Enrich with product, variant, and branch details
    const enriched = await Promise.all(
      movements.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const branch = await ctx.db.get(movement.branchId);
        let variant = null;
        if (movement.variantId) {
          variant = await ctx.db.get(movement.variantId);
        }

        return {
          ...movement,
          product,
          variant,
          branch,
        };
      })
    );

    return enriched;
  },
});

// List stock movements by product
export const listByProduct = query({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    movementType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    // Filter by variant
    if (args.variantId) {
      movements = movements.filter((m) => m.variantId === args.variantId);
    }

    // Filter by movement type
    if (args.movementType) {
      movements = movements.filter((m) => m.movementType === args.movementType);
    }

    // Filter by date range
    if (args.startDate) {
      movements = movements.filter((m) => m.movementDate >= args.startDate!);
    }
    if (args.endDate) {
      movements = movements.filter((m) => m.movementDate <= args.endDate!);
    }

    // Enrich with product, variant, and branch details
    const enriched = await Promise.all(
      movements.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const branch = await ctx.db.get(movement.branchId);
        let variant = null;
        if (movement.variantId) {
          variant = await ctx.db.get(movement.variantId);
        }

        return {
          ...movement,
          product,
          variant,
          branch,
        };
      })
    );

    return enriched;
  },
});

// List all stock movements with filters
export const list = query({
  args: {
    movementType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let movements;
    
    if (args.movementType) {
      movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_movement_type", (q) =>
          q.eq("movementType", args.movementType!)
        )
        .order("desc")
        .take(limit);
    } else {
      movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_movement_date")
        .order("desc")
        .take(limit);
    }

    // Filter by date range
    let filtered = movements;
    if (args.startDate) {
      filtered = filtered.filter((m) => m.movementDate >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((m) => m.movementDate <= args.endDate!);
    }

    // Enrich with product, variant, and branch details
    const enriched = await Promise.all(
      filtered.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const branch = await ctx.db.get(movement.branchId);
        let variant = null;
        if (movement.variantId) {
          variant = await ctx.db.get(movement.variantId);
        }

        return {
          ...movement,
          product,
          variant,
          branch,
        };
      })
    );

    return enriched;
  },
});

// Get movement by reference (e.g., all movements for a specific PO)
export const listByReference = query({
  args: {
    referenceType: v.string(),
    referenceId: v.string(),
  },
  handler: async (ctx, args) => {
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_reference", (q) =>
        q.eq("referenceType", args.referenceType).eq("referenceId", args.referenceId)
      )
      .collect();

    // Enrich with product, variant, and branch details
    const enriched = await Promise.all(
      movements.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const branch = await ctx.db.get(movement.branchId);
        let variant = null;
        if (movement.variantId) {
          variant = await ctx.db.get(movement.variantId);
        }

        return {
          ...movement,
          product,
          variant,
          branch,
        };
      })
    );

    return enriched;
  },
});
