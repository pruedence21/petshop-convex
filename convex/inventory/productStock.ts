import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { buildError } from "../../lib/errors";
import { createStockAdjustmentJournalEntry, createInitialStockJournalEntry } from "../finance/accountingHelpers";

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
    batchNumber: v.optional(v.string()),
    expiredDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get product to check type
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error(JSON.stringify(buildError({
        code: "NOT_FOUND",
        message: "Product not found"
      })));
    }

    // Check if product type allows stock tracking
    const isInventoryItem = !product.type || product.type === "product" || product.type === "medicine";
    if (!isInventoryItem) {
      throw new Error(JSON.stringify(buildError({
        code: "INVALID_ITEM_TYPE",
        message: `Cannot adjust stock for item type: ${product.type}`
      })));
    }

    // Validate expiry requirements
    if (product.hasExpiry) {
      if (args.quantity > 0 && (!args.batchNumber || !args.expiredDate)) {
        throw new Error(JSON.stringify(buildError({
          code: "VALIDATION",
          message: "Batch number and expiry date are required for this product"
        })));
      }
    }

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
        throw new Error(JSON.stringify(buildError({
          code: "INSUFFICIENT_STOCK",
          message: "Insufficient stock for adjustment"
        })));
      }

      // Update stock
      await ctx.db.patch(existingStock._id, {
        quantity: newQuantity,
        lastUpdated: now,
        updatedBy: undefined, // TODO: auth integration
      });

      // Log movement
      const movementId = await ctx.db.insert("stockMovements", {
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

      // Accounting Integration
      const category = await ctx.db.get(product.categoryId);
      const cost = Math.abs(args.quantity) * existingStock.averageCost;

      await createStockAdjustmentJournalEntry(ctx, {
        adjustmentId: movementId,
        branchId: args.branchId,
        adjustmentDate: now,
        description: args.notes || `Stock Adjustment ${movementType}`,
        items: [{
          productName: product.name,
          category: category?.name || "Uncategorized",
          quantity: args.quantity,
          cost,
        }]
      });

      // Handle Batch Logic
      if (product.hasExpiry && args.quantity > 0) {
        await ctx.db.insert("productStockBatches", {
          branchId: args.branchId,
          productId: args.productId,
          variantId: args.variantId,
          batchNumber: args.batchNumber!,
          expiredDate: args.expiredDate!,
          quantity: args.quantity,
          initialQuantity: args.quantity,
          receivedDate: now,
          createdBy: undefined,
        });
      } else if (product.hasExpiry && args.quantity < 0) {
        // FEFO for adjustment OUT
        let remainingToDeduct = Math.abs(args.quantity);

        const batches = await ctx.db
          .query("productStockBatches")
          .withIndex("by_product_expiry", (q) =>
            q.eq("productId", args.productId)
          )
          .filter((q) => q.gt(q.field("quantity"), 0))
          .collect();

        const branchBatches = batches.filter(b =>
          b.branchId === args.branchId &&
          (args.variantId ? b.variantId === args.variantId : !b.variantId)
        ).sort((a, b) => a.expiredDate - b.expiredDate);

        for (const batch of branchBatches) {
          if (remainingToDeduct <= 0) break;

          const deduct = Math.min(batch.quantity, remainingToDeduct);
          await ctx.db.patch(batch._id, {
            quantity: batch.quantity - deduct
          });
          remainingToDeduct -= deduct;
        }
      }

      return existingStock._id;
    } else {
      // Create new stock record (only if positive adjustment)
      if (args.quantity < 0) {
        throw new Error(JSON.stringify(buildError({
          code: "INVALID_QUANTITY",
          message: "Cannot create stock with negative quantity"
        })));
      }

      // Get product to use its purchase price as initial average cost
      // const product = await ctx.db.get(args.productId); // Already fetched above
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
      const movementId = await ctx.db.insert("stockMovements", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        movementType,
        quantity: args.quantity,
        referenceType: "Adjustment",
        referenceId: stockId,
        movementDate: now,
        notes: args.notes,
        createdBy: undefined, // TODO: auth integration
      });

      // Accounting Integration
      const category = await ctx.db.get(product.categoryId);
      const cost = Math.abs(args.quantity) * initialCost;

      await createStockAdjustmentJournalEntry(ctx, {
        adjustmentId: movementId,
        branchId: args.branchId,
        adjustmentDate: now,
        description: args.notes || `Stock Adjustment ${movementType}`,
        items: [{
          productName: product.name,
          category: category?.name || "Uncategorized",
          quantity: args.quantity,
          cost,
        }]
      });

      // Handle Batch Logic for New Stock
      if (product.hasExpiry && args.quantity > 0) {
        await ctx.db.insert("productStockBatches", {
          branchId: args.branchId,
          productId: args.productId,
          variantId: args.variantId,
          batchNumber: args.batchNumber!,
          expiredDate: args.expiredDate!,
          quantity: args.quantity,
          initialQuantity: args.quantity,
          receivedDate: now,
          createdBy: undefined,
        });
      }

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
      throw new Error(JSON.stringify(buildError({
        code: "INVALID_QUANTITY",
        message: "Transfer quantity must be positive"
      })));
    }

    if (args.fromBranchId === args.toBranchId) {
      throw new Error(JSON.stringify(buildError({
        code: "VALIDATION",
        message: "Cannot transfer to the same branch"
      })));
    }

    const now = Date.now();

    // Get product to check type
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error(JSON.stringify(buildError({
        code: "NOT_FOUND",
        message: "Product not found"
      })));
    }

    // Check if product type allows stock tracking
    const isInventoryItem = !product.type || product.type === "product" || product.type === "medicine";
    if (!isInventoryItem) {
      throw new Error(JSON.stringify(buildError({
        code: "INVALID_ITEM_TYPE",
        message: `Cannot transfer stock for item type: ${product.type}`
      })));
    }

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
      throw new Error(JSON.stringify(buildError({
        code: "NOT_FOUND",
        message: "Source stock not found"
      })));
    }

    if (sourceStock.quantity < args.quantity) {
      throw new Error(JSON.stringify(buildError({
        code: "INSUFFICIENT_STOCK",
        message: "Insufficient stock for transfer"
      })));
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
    batchNumber?: string;
    expiredDate?: number;
  }
) {
  const now = Date.now();

  // Get product to check type
  const product = await ctx.db.get(args.productId);
  if (!product) {
    throw new Error(JSON.stringify(buildError({
      code: "NOT_FOUND",
      message: "Product not found"
    })));
  }

  // Check if product type allows stock tracking
  const isInventoryItem = !product.type || product.type === "product" || product.type === "medicine";

  // If not inventory item (Service/Procedure), do not update stock
  if (!isInventoryItem) {
    return null; // Return null or appropriate value indicating no stock update
  }

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

  // Handle Batch Logic
  if (product.hasExpiry) {
    if (args.batchNumber && args.expiredDate) {
      await ctx.db.insert("productStockBatches", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        batchNumber: args.batchNumber,
        expiredDate: args.expiredDate,
        quantity: args.quantity,
        initialQuantity: args.quantity,
        purchaseOrderId: args.purchaseOrderId,
        receivedDate: now,
        createdBy: undefined,
      });
    }
  }

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
    batchNumber: v.optional(v.string()),
    expiredDate: v.optional(v.number()),
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

  // Get product to check type
  const product = await ctx.db.get(args.productId);
  if (!product) {
    throw new Error(JSON.stringify(buildError({
      code: "NOT_FOUND",
      message: "Product not found"
    })));
  }

  // Check if product type allows stock tracking
  const isInventoryItem = !product.type || product.type === "product" || product.type === "medicine";

  // If not inventory item (Service/Procedure), skip stock reduction
  if (!isInventoryItem) {
    return { cogs: 0, avgCost: 0 };
  }

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
    throw new Error(JSON.stringify(buildError({
      code: "NOT_FOUND",
      message: "Stock not found for this product/variant at this branch"
    })));
  }

  if (existingStock.quantity < args.quantity) {
    throw new Error(JSON.stringify(buildError({
      code: "INSUFFICIENT_STOCK",
      message: `Insufficient stock. Available: ${existingStock.quantity}, Required: ${args.quantity}`,
      details: { available: existingStock.quantity, required: args.quantity }
    })));
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

  // Handle Batch Logic (FEFO)
  if (product.hasExpiry) {
    let remainingToDeduct = args.quantity;

    const batches = await ctx.db
      .query("productStockBatches")
      .withIndex("by_product_expiry", (q: any) =>
        q.eq("productId", args.productId).gt("quantity", 0)
      )
      .collect();

    const branchBatches = batches
      .filter((b: any) =>
        b.branchId === args.branchId &&
        (args.variantId ? b.variantId === args.variantId : !b.variantId)
      )
      .sort((a: any, b: any) => a.expiredDate - b.expiredDate);

    for (const batch of branchBatches) {
      if (remainingToDeduct <= 0) break;

      const deduct = Math.min(batch.quantity, remainingToDeduct);

      await ctx.db.patch(batch._id, {
        quantity: batch.quantity - deduct
      });

      remainingToDeduct -= deduct;
    }
  }

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

// Add Initial Stock (Capital Injection)
export const addInitialStock = mutation({
  args: {
    branchId: v.id("branches"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitCost: v.number(),
    batchNumber: v.optional(v.string()),
    expiredDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error(JSON.stringify(buildError({
        code: "INVALID_QUANTITY",
        message: "Quantity must be positive"
      })));
    }

    const now = Date.now();
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if product type allows stock tracking
    const isInventoryItem = !product.type || product.type === "product" || product.type === "medicine";
    if (!isInventoryItem) {
      throw new Error(`Cannot add stock for item type: ${product.type}`);
    }

    // Find existing stock or create new
    const existingStocks = await ctx.db
      .query("productStock")
      .withIndex("by_branch_product", (q) =>
        q.eq("branchId", args.branchId).eq("productId", args.productId)
      )
      .collect();

    const existingStock = existingStocks.find((s) =>
      args.variantId ? s.variantId === args.variantId : !s.variantId
    );

    let stockId: Id<"productStock">;

    if (existingStock) {
      // Update weighted average cost
      const currentQty = existingStock.quantity;
      const currentAvgCost = existingStock.averageCost;
      const newQty = currentQty + args.quantity;
      const newAvgCost =
        (currentQty * currentAvgCost + args.quantity * args.unitCost) / newQty;

      await ctx.db.patch(existingStock._id, {
        quantity: newQty,
        averageCost: newAvgCost,
        lastUpdated: now,
        updatedBy: undefined,
      });
      stockId = existingStock._id;
    } else {
      stockId = await ctx.db.insert("productStock", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        quantity: args.quantity,
        averageCost: args.unitCost,
        lastUpdated: now,
        updatedBy: undefined,
      });
    }

    // Log movement
    const movementId = await ctx.db.insert("stockMovements", {
      branchId: args.branchId,
      productId: args.productId,
      variantId: args.variantId,
      movementType: "INITIAL_STOCK",
      quantity: args.quantity,
      referenceType: "InitialStock",
      referenceId: stockId,
      movementDate: now,
      notes: args.notes || "Initial Stock Input",
      createdBy: undefined,
    });

    // Handle Batch Logic
    if (product.hasExpiry) {
      if (!args.batchNumber || !args.expiredDate) {
        throw new Error("Batch number and expiry date are required for this product");
      }
      await ctx.db.insert("productStockBatches", {
        branchId: args.branchId,
        productId: args.productId,
        variantId: args.variantId,
        batchNumber: args.batchNumber,
        expiredDate: args.expiredDate,
        quantity: args.quantity,
        initialQuantity: args.quantity,
        receivedDate: now,
        createdBy: undefined,
      });
    }

    // Accounting Integration
    const category = await ctx.db.get(product.categoryId);
    const totalCost = args.quantity * args.unitCost;

    await createInitialStockJournalEntry(ctx, {
      stockId: movementId,
      branchId: args.branchId,
      date: now,
      description: args.notes || `Stok Awal: ${product.name}`,
      items: [{
        productName: product.name,
        category: category?.name || "Uncategorized",
        quantity: args.quantity,
        cost: totalCost,
      }]
    });

    return stockId;
  },
});
