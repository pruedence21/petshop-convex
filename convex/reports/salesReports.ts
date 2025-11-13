import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Laporan Penjualan & POS
 * Sales & Point of Sale Reports
 */

// Ringkasan Penjualan (Sales Summary)
export const getSalesSummary = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    summary: v.object({
      totalSales: v.number(),
      totalTransactions: v.number(),
      totalRevenue: v.number(),
      totalDiscount: v.number(),
      totalTax: v.number(),
      averageTransaction: v.number(),
      totalItemsSold: v.number(),
      completedSales: v.number(),
      cancelledSales: v.number(),
    }),
    paymentMethods: v.array(
      v.object({
        method: v.string(),
        count: v.number(),
        amount: v.number(),
        percentage: v.number(),
      })
    ),
    topProducts: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        sku: v.string(),
        quantitySold: v.number(),
        revenue: v.number(),
      })
    ),
    salesByDay: v.array(
      v.object({
        date: v.number(),
        transactionCount: v.number(),
        revenue: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get sales in period
    let salesQuery = ctx.db.query("sales").withIndex("by_sale_date");

    const allSales = await salesQuery.collect();

    const sales = allSales.filter((sale) => {
      if (sale.deletedAt) return false;
      if (sale.saleDate < args.startDate || sale.saleDate > args.endDate)
        return false;
      if (args.branchId && sale.branchId !== args.branchId) return false;
      return true;
    });

    const completedSales = sales.filter((s) => s.status === "Completed");
    const cancelledSales = sales.filter((s) => s.status === "Cancelled");

    // Calculate summary
    const totalRevenue = completedSales.reduce(
      (sum, s) => sum + s.totalAmount,
      0
    );
    const totalDiscount = completedSales.reduce(
      (sum, s) => sum + s.discountAmount,
      0
    );
    const totalTax = completedSales.reduce((sum, s) => sum + s.taxAmount, 0);
    const averageTransaction =
      completedSales.length > 0 ? totalRevenue / completedSales.length : 0;

    // Get sale items for item count
    const saleIds = completedSales.map((s) => s._id);
    const allSaleItems = await ctx.db.query("saleItems").collect();
    const saleItems = allSaleItems.filter(
      (item) => !item.deletedAt && saleIds.includes(item.saleId)
    );

    const totalItemsSold = saleItems.reduce((sum, item) => sum + item.quantity, 0);

    // Payment methods analysis
    const allPayments = await ctx.db.query("salePayments").collect();
    const payments = allPayments.filter(
      (p) => !p.deletedAt && saleIds.includes(p.saleId)
    );

    const paymentMethodMap = new Map<
      string,
      { count: number; amount: number }
    >();
    for (const payment of payments) {
      const existing = paymentMethodMap.get(payment.paymentMethod) || {
        count: 0,
        amount: 0,
      };
      paymentMethodMap.set(payment.paymentMethod, {
        count: existing.count + 1,
        amount: existing.amount + payment.amount,
      });
    }

    const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentMethods = Array.from(paymentMethodMap.entries()).map(
      ([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage:
          totalPaymentAmount > 0 ? (data.amount / totalPaymentAmount) * 100 : 0,
      })
    );

    // Top products
    const productSalesMap = new Map<
      string,
      { quantity: number; revenue: number }
    >();
    for (const item of saleItems) {
      const key = item.productId;
      const existing = productSalesMap.get(key) || { quantity: 0, revenue: 0 };
      productSalesMap.set(key, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.subtotal,
      });
    }

    const topProductsData = await Promise.all(
      Array.from(productSalesMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(async ([productId, data]) => {
          const product = await ctx.db.get(productId as any) as any;
          return {
            productId: productId as any,
            productName: product?.name || "Unknown",
            sku: product?.sku || "",
            quantitySold: data.quantity,
            revenue: data.revenue,
          };
        })
    );

    // Sales by day
    const salesByDayMap = new Map<string, { count: number; revenue: number }>();
    for (const sale of completedSales) {
      const dateKey = new Date(sale.saleDate).toISOString().split("T")[0];
      const existing = salesByDayMap.get(dateKey) || { count: 0, revenue: 0 };
      salesByDayMap.set(dateKey, {
        count: existing.count + 1,
        revenue: existing.revenue + sale.totalAmount,
      });
    }

    const salesByDay = Array.from(salesByDayMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).getTime(),
        transactionCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.date - b.date);

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      summary: {
        totalSales: sales.length,
        totalTransactions: completedSales.length,
        totalRevenue,
        totalDiscount,
        totalTax,
        averageTransaction,
        totalItemsSold,
        completedSales: completedSales.length,
        cancelledSales: cancelledSales.length,
      },
      paymentMethods,
      topProducts: topProductsData,
      salesByDay,
    };
  },
});

// Laporan Penjualan Per Pelanggan (Sales by Customer)
export const getSalesByCustomer = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      customerId: v.id("customers"),
      customerCode: v.string(),
      customerName: v.string(),
      totalTransactions: v.number(),
      totalRevenue: v.number(),
      totalDiscount: v.number(),
      averageTransaction: v.number(),
      lastPurchaseDate: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allSales = await ctx.db.query("sales").withIndex("by_sale_date").collect();

    const sales = allSales.filter((sale) => {
      if (sale.deletedAt) return false;
      if (sale.status !== "Completed") return false;
      if (sale.saleDate < args.startDate || sale.saleDate > args.endDate)
        return false;
      if (args.branchId && sale.branchId !== args.branchId) return false;
      return true;
    });

    const customerSalesMap = new Map<
      string,
      {
        transactions: number;
        revenue: number;
        discount: number;
        lastDate: number;
      }
    >();

    for (const sale of sales) {
      const customerId = sale.customerId;
      const existing = customerSalesMap.get(customerId) || {
        transactions: 0,
        revenue: 0,
        discount: 0,
        lastDate: 0,
      };

      customerSalesMap.set(customerId, {
        transactions: existing.transactions + 1,
        revenue: existing.revenue + sale.totalAmount,
        discount: existing.discount + sale.discountAmount,
        lastDate: Math.max(existing.lastDate, sale.saleDate),
      });
    }

    const result = await Promise.all(
      Array.from(customerSalesMap.entries()).map(
        async ([customerId, data]) => {
          const customer = await ctx.db.get(customerId as any) as any;
          return {
            customerId: customerId as any,
            customerCode: customer?.code || "",
            customerName: customer?.name || "Unknown",
            totalTransactions: data.transactions,
            totalRevenue: data.revenue,
            totalDiscount: data.discount,
            averageTransaction:
              data.transactions > 0 ? data.revenue / data.transactions : 0,
            lastPurchaseDate: data.lastDate,
          };
        }
      )
    );

    const sorted = result.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

// Laporan Performa Kasir (Cashier Performance)
export const getCashierPerformance = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      userId: v.optional(v.id("users")),
      userName: v.string(),
      totalTransactions: v.number(),
      totalRevenue: v.number(),
      averageTransaction: v.number(),
      totalItemsSold: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allSales = await ctx.db.query("sales").withIndex("by_sale_date").collect();

    const sales = allSales.filter((sale) => {
      if (sale.deletedAt) return false;
      if (sale.status !== "Completed") return false;
      if (sale.saleDate < args.startDate || sale.saleDate > args.endDate)
        return false;
      if (args.branchId && sale.branchId !== args.branchId) return false;
      return true;
    });

    const cashierMap = new Map<
      string,
      { transactions: number; revenue: number; itemCount: number }
    >();

    const saleIds = sales.map((s) => s._id);
    const allSaleItems = await ctx.db.query("saleItems").collect();
    const saleItems = allSaleItems.filter(
      (item) => !item.deletedAt && saleIds.includes(item.saleId)
    );

    const saleItemsMap = new Map<string, number>();
    for (const item of saleItems) {
      const existing = saleItemsMap.get(item.saleId) || 0;
      saleItemsMap.set(item.saleId, existing + item.quantity);
    }

    for (const sale of sales) {
      const userId = sale.createdBy || "unknown";
      const existing = cashierMap.get(userId) || {
        transactions: 0,
        revenue: 0,
        itemCount: 0,
      };

      cashierMap.set(userId, {
        transactions: existing.transactions + 1,
        revenue: existing.revenue + sale.totalAmount,
        itemCount: existing.itemCount + (saleItemsMap.get(sale._id) || 0),
      });
    }

    const result = await Promise.all(
      Array.from(cashierMap.entries()).map(async ([userId, data]) => {
        let userName = "System";
        if (userId !== "unknown") {
          const user = await ctx.db.get(userId as any) as any;
          userName = user?.name || user?.email || "Unknown User";
        }

        return {
          userId: userId !== "unknown" ? (userId as any) : undefined,
          userName,
          totalTransactions: data.transactions,
          totalRevenue: data.revenue,
          averageTransaction:
            data.transactions > 0 ? data.revenue / data.transactions : 0,
          totalItemsSold: data.itemCount,
        };
      })
    );

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
});
