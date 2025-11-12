import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Laporan Inventori & Stok
 * Inventory & Stock Reports
 */

// Ringkasan Stok (Stock Summary)
export const getStockSummary = query({
  args: {
    branchId: v.optional(v.id("branches")),
    categoryId: v.optional(v.id("productCategories")),
  },
  returns: v.object({
    totalProducts: v.number(),
    totalSKUs: v.number(),
    totalStockValue: v.number(),
    lowStockItems: v.number(),
    outOfStockItems: v.number(),
    excessStockItems: v.number(),
    stockByCategory: v.array(
      v.object({
        categoryId: v.id("productCategories"),
        categoryName: v.string(),
        itemCount: v.number(),
        totalValue: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all stock
    let stockQuery = ctx.db.query("productStock");
    if (args.branchId) {
      stockQuery = stockQuery.withIndex("by_branch", (q) =>
        q.eq("branchId", args.branchId)
      );
    }

    const allStock = await stockQuery.collect();
    const stock = allStock.filter((s) => s.quantity > 0);

    // Get products
    const productIds = [...new Set(stock.map((s) => s.productId))];
    const products = await Promise.all(
      productIds.map((id) => ctx.db.get(id))
    );
    const validProducts = products.filter(
      (p) => p && !p.deletedAt && p.isActive
    );

    // Filter by category if specified
    let filteredProducts = validProducts;
    if (args.categoryId) {
      filteredProducts = validProducts.filter(
        (p) => p!.categoryId === args.categoryId
      );
    }

    // Calculate metrics
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let excessStockCount = 0;

    const categoryValueMap = new Map<string, { count: number; value: number }>();

    for (const product of filteredProducts) {
      if (!product) continue;

      const productStock = stock.filter((s) => s.productId === product._id);
      const totalQty = productStock.reduce((sum, s) => sum + s.quantity, 0);
      const avgCost =
        productStock.length > 0
          ? productStock.reduce((sum, s) => sum + s.averageCost, 0) /
            productStock.length
          : 0;

      const stockValue = totalQty * avgCost;
      totalStockValue += stockValue;

      // Check stock levels
      if (totalQty === 0) {
        outOfStockCount++;
      } else if (totalQty <= product.minStock) {
        lowStockCount++;
      } else if (totalQty > product.maxStock) {
        excessStockCount++;
      }

      // Category aggregation
      const categoryId = product.categoryId;
      const existing = categoryValueMap.get(categoryId) || {
        count: 0,
        value: 0,
      };
      categoryValueMap.set(categoryId, {
        count: existing.count + 1,
        value: existing.value + stockValue,
      });
    }

    // Get category names
    const stockByCategory = await Promise.all(
      Array.from(categoryValueMap.entries()).map(
        async ([categoryId, data]) => {
          const category = await ctx.db.get(categoryId as any);
          return {
            categoryId: categoryId as any,
            categoryName: category?.name || "Unknown",
            itemCount: data.count,
            totalValue: data.value,
          };
        }
      )
    );

    return {
      totalProducts: filteredProducts.length,
      totalSKUs: stock.length,
      totalStockValue,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      excessStockItems: excessStockCount,
      stockByCategory: stockByCategory.sort((a, b) => b.totalValue - a.totalValue),
    };
  },
});

// Laporan Pergerakan Stok (Stock Movement Report)
export const getStockMovements = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    productId: v.optional(v.id("products")),
    movementType: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      movementId: v.id("stockMovements"),
      movementDate: v.number(),
      productId: v.id("products"),
      productName: v.string(),
      sku: v.string(),
      movementType: v.string(),
      quantity: v.number(),
      referenceType: v.string(),
      referenceId: v.string(),
      branchName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    let movementsQuery = ctx.db
      .query("stockMovements")
      .withIndex("by_movement_date");

    const allMovements = await movementsQuery.collect();

    const movements = allMovements.filter((m) => {
      if (m.movementDate < args.startDate || m.movementDate > args.endDate)
        return false;
      if (args.branchId && m.branchId !== args.branchId) return false;
      if (args.productId && m.productId !== args.productId) return false;
      if (args.movementType && m.movementType !== args.movementType)
        return false;
      return true;
    });

    const result = await Promise.all(
      movements.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const branch = await ctx.db.get(movement.branchId);

        return {
          movementId: movement._id,
          movementDate: movement.movementDate,
          productId: movement.productId,
          productName: product?.name || "Unknown",
          sku: product?.sku || "",
          movementType: movement.movementType,
          quantity: movement.quantity,
          referenceType: movement.referenceType,
          referenceId: movement.referenceId,
          branchName: branch?.name || "Unknown",
        };
      })
    );

    return result.sort((a, b) => b.movementDate - a.movementDate);
  },
});

// Laporan Stok Minimum (Low Stock Report)
export const getLowStockItems = query({
  args: {
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      productId: v.id("products"),
      productName: v.string(),
      sku: v.string(),
      categoryName: v.string(),
      branchName: v.string(),
      currentStock: v.number(),
      minStock: v.number(),
      maxStock: v.number(),
      stockValue: v.number(),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    let stockQuery = ctx.db.query("productStock");
    if (args.branchId) {
      stockQuery = stockQuery.withIndex("by_branch", (q) =>
        q.eq("branchId", args.branchId)
      );
    }

    const allStock = await stockQuery.collect();

    const lowStockItems = [];

    for (const stock of allStock) {
      const product = await ctx.db.get(stock.productId);
      if (!product || product.deletedAt || !product.isActive) continue;

      let status = "Normal";
      if (stock.quantity === 0) {
        status = "Out of Stock";
      } else if (stock.quantity <= product.minStock) {
        status = "Low Stock";
      } else {
        continue; // Skip normal stock items
      }

      const category = await ctx.db.get(product.categoryId);
      const branch = await ctx.db.get(stock.branchId);

      lowStockItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        categoryName: category?.name || "Unknown",
        branchName: branch?.name || "Unknown",
        currentStock: stock.quantity,
        minStock: product.minStock,
        maxStock: product.maxStock,
        stockValue: stock.quantity * stock.averageCost,
        status,
      });
    }

    return lowStockItems.sort((a, b) => {
      if (a.status === "Out of Stock" && b.status !== "Out of Stock") return -1;
      if (a.status !== "Out of Stock" && b.status === "Out of Stock") return 1;
      return a.currentStock - b.currentStock;
    });
  },
});

// Laporan Valuasi Stok (Stock Valuation Report)
export const getStockValuation = query({
  args: {
    asOfDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    asOfDate: v.number(),
    totalValue: v.number(),
    itemCount: v.number(),
    details: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        sku: v.string(),
        categoryName: v.string(),
        quantity: v.number(),
        averageCost: v.number(),
        totalValue: v.number(),
        branchName: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    let stockQuery = ctx.db.query("productStock");
    if (args.branchId) {
      stockQuery = stockQuery.withIndex("by_branch", (q) =>
        q.eq("branchId", args.branchId)
      );
    }

    const allStock = await stockQuery.collect();
    const stock = allStock.filter((s) => s.quantity > 0);

    let totalValue = 0;
    const details = [];

    for (const s of stock) {
      const product = await ctx.db.get(s.productId);
      if (!product || product.deletedAt || !product.isActive) continue;

      const value = s.quantity * s.averageCost;
      totalValue += value;

      const category = await ctx.db.get(product.categoryId);
      const branch = await ctx.db.get(s.branchId);

      details.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        categoryName: category?.name || "Unknown",
        quantity: s.quantity,
        averageCost: s.averageCost,
        totalValue: value,
        branchName: branch?.name || "Unknown",
      });
    }

    return {
      asOfDate: args.asOfDate,
      totalValue,
      itemCount: details.length,
      details: details.sort((a, b) => b.totalValue - a.totalValue),
    };
  },
});

// Laporan Produk Terlaris (Best Selling Products)
export const getBestSellingProducts = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      productId: v.id("products"),
      productName: v.string(),
      sku: v.string(),
      categoryName: v.string(),
      quantitySold: v.number(),
      revenue: v.number(),
      profit: v.number(),
      profitMargin: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get completed sales in period
    const allSales = await ctx.db.query("sales").withIndex("by_sale_date").collect();

    const sales = allSales.filter((sale) => {
      if (sale.deletedAt) return false;
      if (sale.status !== "Completed") return false;
      if (sale.saleDate < args.startDate || sale.saleDate > args.endDate)
        return false;
      if (args.branchId && sale.branchId !== args.branchId) return false;
      return true;
    });

    const saleIds = sales.map((s) => s._id);

    // Get sale items
    const allSaleItems = await ctx.db.query("saleItems").collect();
    const saleItems = allSaleItems.filter(
      (item) => !item.deletedAt && saleIds.includes(item.saleId)
    );

    // Aggregate by product
    const productMap = new Map<
      string,
      { quantity: number; revenue: number; cogs: number }
    >();

    for (const item of saleItems) {
      const existing = productMap.get(item.productId) || {
        quantity: 0,
        revenue: 0,
        cogs: 0,
      };

      productMap.set(item.productId, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.subtotal,
        cogs: existing.cogs + item.cogs,
      });
    }

    // Get product details
    const result = await Promise.all(
      Array.from(productMap.entries()).map(async ([productId, data]) => {
        const product = await ctx.db.get(productId as any);
        if (!product) {
          return null;
        }

        const category = await ctx.db.get(product.categoryId);
        const profit = data.revenue - data.cogs;
        const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

        return {
          productId: productId as any,
          productName: product.name,
          sku: product.sku,
          categoryName: category?.name || "Unknown",
          quantitySold: data.quantity,
          revenue: data.revenue,
          profit,
          profitMargin,
        };
      })
    );

    const filtered = result.filter((r) => r !== null) as any[];
    const sorted = filtered.sort((a, b) => b.quantitySold - a.quantitySold);

    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});
