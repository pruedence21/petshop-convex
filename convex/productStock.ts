import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get stock by branch
export const getByBranch = query({
  args: { 
    branchId: v.id("branches"),
    productId: v.optional(v.id("products")),
    lowStockOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let stocks;
    
    if (args.productId) {
      stocks = await ctx.db
        .query("productStock")
        .withIndex("by_branch_product", (q) =>
          q.eq("branchId", args.branchId).eq("productId", args.productId!)
        )
        .collect();
    } else {
      stocks = await ctx.db
        .query("productStock")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId))
        .collect();
    }

    // Enrich with product details
    const enrichedStocks = await Promise.all(
      stocks.map(async (stock) => {
        const product = await ctx.db.get(stock.productId);
        let variant = null;
        if (stock.variantId) {
          variant = await ctx.db.get(stock.variantId);
        }

        // Check if low stock
        const isLowStock = product ? stock.quantity < product.minStock : false;

        return {
          ...stock,
          product,
          variant,
          isLowStock,
        };
      })
    );

    // Filter low stock if requested
    if (args.lowStockOnly) {
      return enrichedStocks.filter((s) => s.isLowStock);
    }

    return enrichedStocks;
  },
});

// Get stock by product (all branches)
export const getByProduct = query({
  args: { 
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
  },
  handler: async (ctx, args) => {
    let stocks;
    
    if (args.variantId) {
      stocks = await ctx.db
        .query("productStock")
        .withIndex("by_variant", (q) => q.eq("variantId", args.variantId!))
        .collect();
    } else {
      stocks = await ctx.db
        .query("productStock")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect();
    }

    // Enrich with branch details
    const enrichedStocks = await Promise.all(
      stocks.map(async (stock) => {
        const branch = await ctx.db.get(stock.branchId);
        return {
          ...stock,
          branch,
        };
      })
    );

    return enrichedStocks;
  },
});

// Get low stock items across all branches or specific branch
export const getLowStock = query({
  args: { 
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    const stocks = args.branchId
      ? await ctx.db
          .query("productStock")
          .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
          .collect()
      : await ctx.db.query("productStock").collect();

    const lowStockItems = [];

    for (const stock of stocks) {
      const product = await ctx.db.get(stock.productId);
      if (!product) continue;

      if (stock.quantity < product.minStock) {
        const branch = await ctx.db.get(stock.branchId);
        let variant = null;
        if (stock.variantId) {
          variant = await ctx.db.get(stock.variantId);
        }

        lowStockItems.push({
          ...stock,
          product,
          variant,
          branch,
          shortage: product.minStock - stock.quantity,
        });
      }
    }

    return lowStockItems;
  },
});

// Adjust stock (manual adjustment IN or OUT)
export const adjustStock = mutation({
  args: {
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(), // Positive for IN, negative for OUT
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find existing stock record
    const existingStocks = await ctx.db
      .query("productStock")
      .withIndex("by_branch_product", (q) =>
        q.eq("branchId", args.branchId).eq("productId", args.productId)
      )
      .collect();

    const existingStock = existingStocks.find((s) =>
      args.variantId ? s.variantId === args.variantId : !s.variantId
    );

    const movementType = args.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const now = Date.now();

    if (existingStock) {
      const newQuantity = existingStock.quantity + args.quantity;
      
      if (newQuantity < 0) {
        throw new Error("Insufficient stock for adjustment");
      }

      // Update stock
      await ctx.db.patch(existingStock._id, {
        quantity: newQuantity,
        lastUpdated: now,
        updatedBy: undefined, // TODO: auth integration
      });

      // Log movement
      await ctx.db.insert("stockMovements", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        movementType,
        quantity: args.quantity,
        referenceType: "Adjustment",
        referenceId: existingStock._id,
        movementDate: now,
        notes: args.notes,
        createdBy: undefined, // TODO: auth integration
      });

      return existingStock._id;
    } else {
      // Create new stock record (only if positive adjustment)
      if (args.quantity < 0) {
        throw new Error("Cannot create stock with negative quantity");
      }

      // Get product to use its purchase price as initial average cost
      const product = await ctx.db.get(args.productId);
      const initialCost = product?.purchasePrice || 0;

      const stockId = await ctx.db.insert("productStock", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        quantity: args.quantity,
        averageCost: initialCost,
        lastUpdated: now,
        updatedBy: undefined,
      });

      // Log movement
      await ctx.db.insert("stockMovements", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        movementType,
        quantity: args.quantity,
        referenceType: "Adjustment",
        referenceId: stockId,
        movementDate: now,
        notes: args.notes,
        createdBy: undefined,
      });

      return stockId;
    }
  },
});

// Transfer stock between branches
export const transferStock = mutation({
  args: {
    fromBranchId: v.id("branches"),
    toBranchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Transfer quantity must be positive");
    }

    if (args.fromBranchId === args.toBranchId) {
      throw new Error("Cannot transfer to the same branch");
    }

    const now = Date.now();

    // Find source stock
    const sourceStocks = await ctx.db
      .query("productStock")
      .withIndex("by_branch_product", (q) =>
        q.eq("branchId", args.fromBranchId).eq("productId", args.productId)
      )
      .collect();

    const sourceStock = sourceStocks.find((s) =>
      args.variantId ? s.variantId === args.variantId : !s.variantId
    );

    if (!sourceStock) {
      throw new Error("Source stock not found");
    }

    if (sourceStock.quantity < args.quantity) {
      throw new Error("Insufficient stock for transfer");
    }

    // Reduce source stock
    await ctx.db.patch(sourceStock._id, {
      quantity: sourceStock.quantity - args.quantity,
      lastUpdated: now,
      updatedBy: undefined,
    });

    // Log TRANSFER_OUT
    await ctx.db.insert("stockMovements", {
      branchId: args.fromBranchId,
      productId: args.productId,
      variantId: args.variantId,
      movementType: "TRANSFER_OUT",
      quantity: -args.quantity,
      referenceType: "Transfer",
      referenceId: `TRANSFER-${now}`,
      movementDate: now,
      notes: args.notes,
      createdBy: undefined,
    });

    // Find or create destination stock
    const destStocks = await ctx.db
      .query("productStock")
      .withIndex("by_branch_product", (q) =>
        q.eq("branchId", args.toBranchId).eq("productId", args.productId)
      )
      .collect();

    const destStock = destStocks.find((s) =>
      args.variantId ? s.variantId === args.variantId : !s.variantId
    );

    if (destStock) {
      await ctx.db.patch(destStock._id, {
        quantity: destStock.quantity + args.quantity,
        lastUpdated: now,
        updatedBy: undefined,
      });
    } else {
      await ctx.db.insert("productStock", {
        branchId: args.toBranchId,
        productId: args.productId,
        variantId: args.variantId,
        quantity: args.quantity,
        averageCost: sourceStock.averageCost, // Use source average cost
        lastUpdated: now,
        updatedBy: undefined,
      });
    }

    // Log TRANSFER_IN
    await ctx.db.insert("stockMovements", {
      branchId: args.toBranchId,
      productId: args.productId,
      variantId: args.variantId,
      movementType: "TRANSFER_IN",
      quantity: args.quantity,
      referenceType: "Transfer",
      referenceId: `TRANSFER-${now}`,
      movementDate: now,
      notes: args.notes,
      createdBy: undefined,
    });

    return `TRANSFER-${now}`;
  },
});

// Helper function for purchase receiving (not exported as mutation)
export async function updateStockFromPurchaseHelper(
  ctx: any,
  args: {
    branchId: Id<"branches">;
    productId: Id<"products">;
    variantId?: Id<"productVariants">;
    quantity: number;
    unitPrice: number;
    purchaseOrderId: Id<"purchaseOrders">;
  }
) {
  const now = Date.now();

  // Find existing stock
  const existingStocks = await ctx.db
    .query("productStock")
    .withIndex("by_branch_product", (q: any) =>
      q.eq("branchId", args.branchId).eq("productId", args.productId)
    )
    .collect();

  const existingStock = existingStocks.find((s: any) =>
    args.variantId ? s.variantId === args.variantId : !s.variantId
  );

  let stockId: Id<"productStock">;

  if (existingStock) {
    // Calculate weighted average cost
    const currentQty = existingStock.quantity;
    const currentAvgCost = existingStock.averageCost;
    const newQty = currentQty + args.quantity;
    const newAvgCost =
      (currentQty * currentAvgCost + args.quantity * args.unitPrice) / newQty;

    await ctx.db.patch(existingStock._id, {
      quantity: newQty,
      averageCost: newAvgCost,
      lastUpdated: now,
      updatedBy: undefined,
    });

    stockId = existingStock._id;
  } else {
    // Create new stock record
    stockId = await ctx.db.insert("productStock", {
      branchId: args.branchId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      averageCost: args.unitPrice,
      lastUpdated: now,
      updatedBy: undefined,
    });
  }

  // Log stock movement
  await ctx.db.insert("stockMovements", {
    branchId: args.branchId,
    productId: args.productId,
    variantId: args.variantId,
    movementType: "PURCHASE_IN",
    quantity: args.quantity,
    referenceType: "PurchaseOrder",
    referenceId: args.purchaseOrderId,
    movementDate: now,
    notes: `Purchase order received`,
    createdBy: undefined,
  });

  return stockId;
}

// Update stock (mutation wrapper for backward compatibility)
export const updateStockFromPurchase = mutation({
  args: {
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    purchaseOrderId: v.id("purchaseOrders"),
  },
  handler: async (ctx, args) => {
    return await updateStockFromPurchaseHelper(ctx, args);
  },
});

// Helper function for sale stock reduction (not exported as mutation)
export async function reduceStockForSaleHelper(
  ctx: any,
  args: {
    branchId: Id<"branches">;
    productId: Id<"products">;
    variantId?: Id<"productVariants">;
    quantity: number;
    saleId: Id<"sales">;
  }
): Promise<{ cogs: number; avgCost: number }> {
  const now = Date.now();

  // Find existing stock
  const existingStocks = await ctx.db
    .query("productStock")
    .withIndex("by_branch_product", (q: any) =>
      q.eq("branchId", args.branchId).eq("productId", args.productId)
    )
    .collect();

  const existingStock = existingStocks.find((s: any) =>
    args.variantId ? s.variantId === args.variantId : !s.variantId
  );

  if (!existingStock) {
    throw new Error("Stock not found for this product/variant at this branch");
  }

  if (existingStock.quantity < args.quantity) {
    throw new Error(
      `Insufficient stock. Available: ${existingStock.quantity}, Required: ${args.quantity}`
    );
  }

  // Calculate COGS (Cost of Goods Sold)
  const cogs = existingStock.averageCost * args.quantity;
  const avgCost = existingStock.averageCost;

  // Reduce stock quantity
  const newQty = existingStock.quantity - args.quantity;

  await ctx.db.patch(existingStock._id, {
    quantity: newQty,
    lastUpdated: now,
    updatedBy: undefined,
  });

  // Log stock movement (SALE_OUT)
  await ctx.db.insert("stockMovements", {
    branchId: args.branchId,
    productId: args.productId,
    variantId: args.variantId,
    movementType: "SALE_OUT",
    quantity: -args.quantity, // Negative for OUT
    referenceType: "Sale",
    referenceId: args.saleId,
    movementDate: now,
    notes: `Sale transaction`,
    createdBy: undefined,
  });

  return { cogs, avgCost };
}

// Reduce stock for sale (mutation wrapper)
export const reduceStockForSale = mutation({
  args: {
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    saleId: v.id("sales"),
  },
  handler: async (ctx, args) => {
    return await reduceStockForSaleHelper(ctx, args);
  },
});
