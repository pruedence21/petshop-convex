import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Laporan Dashboard & Analitik
 * Dashboard & Analytics Reports
 */

// KPI Dashboard Utama (Main KPI Dashboard)
export const getMainDashboard = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    compareWithPreviousPeriod: v.optional(v.boolean()),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    kpis: v.object({
      // Revenue KPIs
      totalRevenue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
        trend: v.optional(v.string()),
      }),
      salesRevenue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      clinicRevenue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      hotelRevenue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      // Transaction KPIs
      totalTransactions: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      averageTransactionValue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      // Customer KPIs
      activeCustomers: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      newCustomers: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      // Inventory KPIs
      inventoryValue: v.object({
        value: v.number(),
        change: v.optional(v.number()),
      }),
      lowStockItems: v.object({
        value: v.number(),
        alert: v.boolean(),
      }),
      // Outstanding KPIs
      accountsReceivable: v.object({
        value: v.number(),
        change: v.optional(v.number()),
        alert: v.boolean(),
      }),
    }),
    revenueBreakdown: v.array(
      v.object({
        category: v.string(),
        amount: v.number(),
        percentage: v.number(),
      })
    ),
    topPerformers: v.object({
      products: v.array(
        v.object({
          name: v.string(),
          revenue: v.number(),
        })
      ),
      customers: v.array(
        v.object({
          name: v.string(),
          totalSpent: v.number(),
        })
      ),
    }),
  }),
  handler: async (ctx, args) => {
    const periodLength = args.endDate - args.startDate;
    const previousStart = args.startDate - periodLength;
    const previousEnd = args.startDate - 1;

    // === SALES DATA ===
    const allSales = await ctx.db.query("sales").withIndex("by_sale_date").collect();
    const currentSales = allSales.filter((s) => {
      if (s.deletedAt || s.status !== "Completed") return false;
      if (s.saleDate < args.startDate || s.saleDate > args.endDate) return false;
      if (args.branchId && s.branchId !== args.branchId) return false;
      return true;
    });

    const salesRevenue = currentSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const salesTransactions = currentSales.length;

    // Previous period sales
    let salesChange = undefined;
    if (args.compareWithPreviousPeriod) {
      const prevSales = allSales.filter((s) => {
        if (s.deletedAt || s.status !== "Completed") return false;
        if (s.saleDate < previousStart || s.saleDate > previousEnd) return false;
        if (args.branchId && s.branchId !== args.branchId) return false;
        return true;
      });
      const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalAmount, 0);
      salesChange =
        prevRevenue > 0 ? ((salesRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    }

    // === CLINIC DATA ===
    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();

    const currentAppointments = allAppointments.filter((a) => {
      if (a.deletedAt || a.status !== "Completed") return false;
      if (a.appointmentDate < args.startDate || a.appointmentDate > args.endDate)
        return false;
      if (args.branchId && a.branchId !== args.branchId) return false;
      return true;
    });

    const clinicRevenue = currentAppointments.reduce(
      (sum, a) => sum + a.totalAmount,
      0
    );

    let clinicChange = undefined;
    if (args.compareWithPreviousPeriod) {
      const prevAppointments = allAppointments.filter((a) => {
        if (a.deletedAt || a.status !== "Completed") return false;
        if (
          a.appointmentDate < previousStart ||
          a.appointmentDate > previousEnd
        )
          return false;
        if (args.branchId && a.branchId !== args.branchId) return false;
        return true;
      });
      const prevRevenue = prevAppointments.reduce(
        (sum, a) => sum + a.totalAmount,
        0
      );
      clinicChange =
        prevRevenue > 0 ? ((clinicRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    }

    // === HOTEL DATA ===
    const allBookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_check_in_date")
      .collect();

    const currentBookings = allBookings.filter((b) => {
      if (b.deletedAt || b.status !== "CheckedOut") return false;
      if (b.checkInDate > args.endDate || b.checkOutDate < args.startDate)
        return false;
      if (args.branchId && b.branchId !== args.branchId) return false;
      return true;
    });

    const hotelRevenue = currentBookings.reduce(
      (sum, b) => sum + b.totalAmount,
      0
    );

    let hotelChange = undefined;
    if (args.compareWithPreviousPeriod) {
      const prevBookings = allBookings.filter((b) => {
        if (b.deletedAt || b.status !== "CheckedOut") return false;
        if (b.checkInDate > previousEnd || b.checkOutDate < previousStart)
          return false;
        if (args.branchId && b.branchId !== args.branchId) return false;
        return true;
      });
      const prevRevenue = prevBookings.reduce((sum, b) => sum + b.totalAmount, 0);
      hotelChange =
        prevRevenue > 0 ? ((hotelRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    }

    // === TOTAL REVENUE ===
    const totalRevenue = salesRevenue + clinicRevenue + hotelRevenue;
    const totalRevenueChange =
      salesChange !== undefined &&
      clinicChange !== undefined &&
      hotelChange !== undefined
        ? (salesChange + clinicChange + hotelChange) / 3
        : undefined;

    const trend =
      totalRevenueChange !== undefined
        ? totalRevenueChange > 0
          ? "up"
          : totalRevenueChange < 0
            ? "down"
            : "stable"
        : undefined;

    // === TRANSACTIONS ===
    const totalTransactions =
      salesTransactions +
      currentAppointments.length +
      currentBookings.length;
    const averageTransactionValue =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // === CUSTOMERS ===
    const customerIds = new Set([
      ...currentSales.map((s) => s.customerId),
      ...currentAppointments.map((a) => a.customerId),
      ...currentBookings.map((b) => b.customerId),
    ]);

    const allCustomers = await ctx.db.query("customers").collect();
    const newCustomers = allCustomers.filter((c) => {
      if (c.deletedAt) return false;
      if (
        c._creationTime < args.startDate ||
        c._creationTime > args.endDate
      )
        return false;
      return true;
    }).length;

    // === INVENTORY ===
    let stockQuery = ctx.db.query("productStock");
    if (args.branchId) {
      stockQuery = stockQuery.withIndex("by_branch", (q) =>
        q.eq("branchId", args.branchId)
      );
    }
    const allStock = await stockQuery.collect();

    const inventoryValue = allStock.reduce(
      (sum, s) => sum + s.quantity * s.averageCost,
      0
    );

    // Low stock check
    const lowStockCount = await Promise.all(
      allStock.map(async (s) => {
        const product = await ctx.db.get(s.productId);
        return product && s.quantity <= product.minStock ? 1 : 0;
      })
    ).then((counts) => counts.reduce((sum, c) => sum + c, 0));

    // === ACCOUNTS RECEIVABLE ===
    const salesAR = currentSales.reduce((sum, s) => sum + s.outstandingAmount, 0);
    const clinicAR = currentAppointments.reduce(
      (sum, a) => sum + a.outstandingAmount,
      0
    );
    const hotelAR = currentBookings.reduce(
      (sum, b) => sum + b.outstandingAmount,
      0
    );
    const totalAR = salesAR + clinicAR + hotelAR;

    // === REVENUE BREAKDOWN ===
    const revenueBreakdown = [
      {
        category: "Penjualan Retail",
        amount: salesRevenue,
        percentage: totalRevenue > 0 ? (salesRevenue / totalRevenue) * 100 : 0,
      },
      {
        category: "Layanan Klinik",
        amount: clinicRevenue,
        percentage: totalRevenue > 0 ? (clinicRevenue / totalRevenue) * 100 : 0,
      },
      {
        category: "Hotel Hewan",
        amount: hotelRevenue,
        percentage: totalRevenue > 0 ? (hotelRevenue / totalRevenue) * 100 : 0,
      },
    ];

    // === TOP PERFORMERS ===
    // Top products
    const saleIds = currentSales.map((s) => s._id);
    const allSaleItems = await ctx.db.query("saleItems").collect();
    const saleItems = allSaleItems.filter(
      (i) => !i.deletedAt && saleIds.includes(i.saleId)
    );

    const productRevMap = new Map<string, number>();
    for (const item of saleItems) {
      const existing = productRevMap.get(item.productId) || 0;
      productRevMap.set(item.productId, existing + item.subtotal);
    }

    const topProductsData = await Promise.all(
      Array.from(productRevMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(async ([productId, revenue]) => {
          const product = await ctx.db.get(productId as any);
          return {
            name: product?.name || "Unknown",
            revenue,
          };
        })
    );

    // Top customers
    const customerSpendMap = new Map<string, number>();
    for (const sale of currentSales) {
      const existing = customerSpendMap.get(sale.customerId) || 0;
      customerSpendMap.set(sale.customerId, existing + sale.totalAmount);
    }

    const topCustomersData = await Promise.all(
      Array.from(customerSpendMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(async ([customerId, totalSpent]) => {
          const customer = await ctx.db.get(customerId as any);
          return {
            name: customer?.name || "Unknown",
            totalSpent,
          };
        })
    );

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      kpis: {
        totalRevenue: {
          value: totalRevenue,
          change: totalRevenueChange,
          trend,
        },
        salesRevenue: {
          value: salesRevenue,
          change: salesChange,
        },
        clinicRevenue: {
          value: clinicRevenue,
          change: clinicChange,
        },
        hotelRevenue: {
          value: hotelRevenue,
          change: hotelChange,
        },
        totalTransactions: {
          value: totalTransactions,
          change: undefined,
        },
        averageTransactionValue: {
          value: averageTransactionValue,
          change: undefined,
        },
        activeCustomers: {
          value: customerIds.size,
          change: undefined,
        },
        newCustomers: {
          value: newCustomers,
          change: undefined,
        },
        inventoryValue: {
          value: inventoryValue,
          change: undefined,
        },
        lowStockItems: {
          value: lowStockCount,
          alert: lowStockCount > 0,
        },
        accountsReceivable: {
          value: totalAR,
          change: undefined,
          alert: totalAR > totalRevenue * 0.3, // Alert if AR > 30% of revenue
        },
      },
      revenueBreakdown,
      topPerformers: {
        products: topProductsData,
        customers: topCustomersData,
      },
    };
  },
});

// Laporan Trend Penjualan (Sales Trend)
export const getSalesTrend = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    groupBy: v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    ),
  },
  returns: v.array(
    v.object({
      period: v.string(),
      timestamp: v.number(),
      salesRevenue: v.number(),
      clinicRevenue: v.number(),
      hotelRevenue: v.number(),
      totalRevenue: v.number(),
      transactionCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all transactions
    const allSales = await ctx.db.query("sales").withIndex("by_sale_date").collect();
    const sales = allSales.filter((s) => {
      if (s.deletedAt || s.status !== "Completed") return false;
      if (s.saleDate < args.startDate || s.saleDate > args.endDate) return false;
      if (args.branchId && s.branchId !== args.branchId) return false;
      return true;
    });

    const allAppointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_appointment_date")
      .collect();
    const appointments = allAppointments.filter((a) => {
      if (a.deletedAt || a.status !== "Completed") return false;
      if (a.appointmentDate < args.startDate || a.appointmentDate > args.endDate)
        return false;
      if (args.branchId && a.branchId !== args.branchId) return false;
      return true;
    });

    const allBookings = await ctx.db
      .query("hotelBookings")
      .withIndex("by_check_in_date")
      .collect();
    const bookings = allBookings.filter((b) => {
      if (b.deletedAt || b.status !== "CheckedOut") return false;
      if (b.checkInDate > args.endDate || b.checkOutDate < args.startDate)
        return false;
      if (args.branchId && b.branchId !== args.branchId) return false;
      return true;
    });

    // Group by period
    const dataMap = new Map<
      string,
      {
        timestamp: number;
        salesRev: number;
        clinicRev: number;
        hotelRev: number;
        count: number;
      }
    >();

    const getPeriodKey = (date: number): { key: string; timestamp: number } => {
      const d = new Date(date);
      if (args.groupBy === "day") {
        const key = d.toISOString().split("T")[0];
        return { key, timestamp: new Date(key).getTime() };
      } else if (args.groupBy === "week") {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7
        );
        const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
        return { key, timestamp: d.getTime() };
      } else {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { key, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      }
    };

    // Process sales
    for (const sale of sales) {
      const { key, timestamp } = getPeriodKey(sale.saleDate);
      const existing = dataMap.get(key) || {
        timestamp,
        salesRev: 0,
        clinicRev: 0,
        hotelRev: 0,
        count: 0,
      };
      dataMap.set(key, {
        ...existing,
        salesRev: existing.salesRev + sale.totalAmount,
        count: existing.count + 1,
      });
    }

    // Process appointments
    for (const apt of appointments) {
      const { key, timestamp } = getPeriodKey(apt.appointmentDate);
      const existing = dataMap.get(key) || {
        timestamp,
        salesRev: 0,
        clinicRev: 0,
        hotelRev: 0,
        count: 0,
      };
      dataMap.set(key, {
        ...existing,
        clinicRev: existing.clinicRev + apt.totalAmount,
        count: existing.count + 1,
      });
    }

    // Process bookings
    for (const booking of bookings) {
      const { key, timestamp } = getPeriodKey(booking.checkOutDate);
      const existing = dataMap.get(key) || {
        timestamp,
        salesRev: 0,
        clinicRev: 0,
        hotelRev: 0,
        count: 0,
      };
      dataMap.set(key, {
        ...existing,
        hotelRev: existing.hotelRev + booking.totalAmount,
        count: existing.count + 1,
      });
    }

    const result = Array.from(dataMap.entries())
      .map(([period, data]) => ({
        period,
        timestamp: data.timestamp,
        salesRevenue: data.salesRev,
        clinicRevenue: data.clinicRev,
        hotelRevenue: data.hotelRev,
        totalRevenue: data.salesRev + data.clinicRev + data.hotelRev,
        transactionCount: data.count,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return result;
  },
});
