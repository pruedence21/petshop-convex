import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Accounts Receivable (AR) Dashboard & Reports
 * 
 * Provides comprehensive AR tracking including:
 * - Aging reports (0-30, 31-60, 61-90, 90+ days)
 * - Customer outstanding summary
 * - Payment history
 * - Collection metrics
 */

// Get AR Aging Report
export const getAgingReport = query({
  args: {
    branchId: v.optional(v.id("branches")),
    asOfDate: v.optional(v.number()),
  },
  returns: v.object({
    asOfDate: v.number(),
    summary: v.object({
      totalOutstanding: v.number(),
      current: v.number(), // 0-30 days
      days31to60: v.number(),
      days61to90: v.number(),
      over90days: v.number(),
      totalCustomers: v.number(),
      customersWithBalance: v.number(),
    }),
    customerAging: v.array(
      v.object({
        customerId: v.id("customers"),
        customerName: v.string(),
        phone: v.optional(v.string()),
        totalOutstanding: v.number(),
        current: v.number(),
        days31to60: v.number(),
        days61to90: v.number(),
        over90days: v.number(),
        oldestInvoiceDate: v.optional(v.number()),
        invoiceCount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const asOfDate = args.asOfDate || Date.now();

    // Get all sales with outstanding balances
    let sales = await ctx.db.query("sales").collect();

    // Filter by branch
    if (args.branchId) {
      sales = sales.filter((s) => s.branchId === args.branchId);
    }

    // Filter completed sales with outstanding amounts
    const outstandingSales = sales.filter(
      (s) =>
        !s.deletedAt &&
        s.status === "Completed" &&
        s.outstandingAmount > 0 &&
        s.saleDate <= asOfDate
    );

    // Get clinic appointments with outstanding balances
    let appointments = await ctx.db.query("clinicAppointments").collect();

    if (args.branchId) {
      appointments = appointments.filter((a) => a.branchId === args.branchId);
    }

    const outstandingAppointments = appointments.filter(
      (a) =>
        !a.deletedAt &&
        a.status === "Completed" &&
        a.outstandingAmount > 0 &&
        a.appointmentDate <= asOfDate
    );

    // Calculate aging for sales
    const calculateAging = (
      date: number
    ): {
      current: number;
      days31to60: number;
      days61to90: number;
      over90days: number;
    } => {
      const daysDiff = Math.floor((asOfDate - date) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 30) {
        return { current: 1, days31to60: 0, days61to90: 0, over90days: 0 };
      } else if (daysDiff <= 60) {
        return { current: 0, days31to60: 1, days61to90: 0, over90days: 0 };
      } else if (daysDiff <= 90) {
        return { current: 0, days31to60: 0, days61to90: 1, over90days: 0 };
      } else {
        return { current: 0, days31to60: 0, days61to90: 0, over90days: 1 };
      }
    };

    // Group by customer
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        phone?: string;
        totalOutstanding: number;
        current: number;
        days31to60: number;
        days61to90: number;
        over90days: number;
        oldestInvoiceDate?: number;
        invoiceCount: number;
      }
    >();

    // Process sales
    for (const sale of outstandingSales) {
      const customer = await ctx.db.get(sale.customerId);
      if (!customer) continue;

      const aging = calculateAging(sale.saleDate);
      const existing = customerMap.get(sale.customerId) || {
        customerId: sale.customerId,
        customerName: customer.name,
        phone: customer.phone,
        totalOutstanding: 0,
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90days: 0,
        oldestInvoiceDate: sale.saleDate,
        invoiceCount: 0,
      };

      // Distribute outstanding amount to appropriate bucket
      let amount = sale.outstandingAmount;
      if (aging.current) existing.current += amount;
      if (aging.days31to60) existing.days31to60 += amount;
      if (aging.days61to90) existing.days61to90 += amount;
      if (aging.over90days) existing.over90days += amount;

      existing.totalOutstanding += amount;
      existing.invoiceCount += 1;

      if (
        !existing.oldestInvoiceDate ||
        sale.saleDate < existing.oldestInvoiceDate
      ) {
        existing.oldestInvoiceDate = sale.saleDate;
      }

      customerMap.set(sale.customerId, existing);
    }

    // Process clinic appointments
    for (const appointment of outstandingAppointments) {
      const customer = await ctx.db.get(appointment.customerId);
      if (!customer) continue;

      const aging = calculateAging(appointment.appointmentDate);
      const existing = customerMap.get(appointment.customerId) || {
        customerId: appointment.customerId,
        customerName: customer.name,
        phone: customer.phone,
        totalOutstanding: 0,
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90days: 0,
        oldestInvoiceDate: appointment.appointmentDate,
        invoiceCount: 0,
      };

      let amount = appointment.outstandingAmount;
      if (aging.current) existing.current += amount;
      if (aging.days31to60) existing.days31to60 += amount;
      if (aging.days61to90) existing.days61to90 += amount;
      if (aging.over90days) existing.over90days += amount;

      existing.totalOutstanding += amount;
      existing.invoiceCount += 1;

      if (
        !existing.oldestInvoiceDate ||
        appointment.appointmentDate < existing.oldestInvoiceDate
      ) {
        existing.oldestInvoiceDate = appointment.appointmentDate;
      }

      customerMap.set(appointment.customerId, existing);
    }

    // Convert map to array
    const customerAging = Array.from(customerMap.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding
    );

    // Calculate summary
    const summary = {
      totalOutstanding: customerAging.reduce(
        (sum, c) => sum + c.totalOutstanding,
        0
      ),
      current: customerAging.reduce((sum, c) => sum + c.current, 0),
      days31to60: customerAging.reduce((sum, c) => sum + c.days31to60, 0),
      days61to90: customerAging.reduce((sum, c) => sum + c.days61to90, 0),
      over90days: customerAging.reduce((sum, c) => sum + c.over90days, 0),
      totalCustomers: await ctx.db.query("customers").collect().then((customers) => customers.filter(c => !c.deletedAt).length),
      customersWithBalance: customerAging.length,
    };

    return {
      asOfDate,
      summary,
      customerAging: customerAging.map((c) => ({
        ...c,
        customerId: c.customerId as any,
      })),
    };
  },
});

// Get customer outstanding detail
export const getCustomerOutstanding = query({
  args: {
    customerId: v.id("customers"),
    includeHistory: v.optional(v.boolean()),
  },
  returns: v.object({
    customer: v.any(),
    summary: v.object({
      totalOutstanding: v.number(),
      invoiceCount: v.number(),
      oldestInvoiceDate: v.optional(v.number()),
      averageDaysOutstanding: v.number(),
    }),
    outstandingInvoices: v.array(
      v.object({
        type: v.string(), // "SALE" or "CLINIC"
        id: v.string(),
        invoiceNumber: v.string(),
        invoiceDate: v.number(),
        dueDate: v.optional(v.number()),
        totalAmount: v.number(),
        paidAmount: v.number(),
        outstandingAmount: v.number(),
        daysOutstanding: v.number(),
        status: v.string(),
      })
    ),
    paymentHistory: v.optional(
      v.array(
        v.object({
          paymentDate: v.number(),
          amount: v.number(),
          paymentMethod: v.string(),
          referenceNumber: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),
  }),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Get outstanding sales
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    const outstandingSales = sales.filter(
      (s) => !s.deletedAt && s.status === "Completed" && s.outstandingAmount > 0
    );

    // Get outstanding clinic appointments
    const appointments = await ctx.db
      .query("clinicAppointments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    const outstandingAppointments = appointments.filter(
      (a) => !a.deletedAt && a.status === "Completed" && a.outstandingAmount > 0
    );

    const now = Date.now();

    // Build outstanding invoices list
    const outstandingInvoices: any[] = [];

    for (const sale of outstandingSales) {
      const daysOutstanding = Math.floor(
        (now - sale.saleDate) / (1000 * 60 * 60 * 24)
      );

      outstandingInvoices.push({
        type: "SALE",
        id: sale._id,
        invoiceNumber: sale.saleNumber,
        invoiceDate: sale.saleDate,
        dueDate: undefined,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        outstandingAmount: sale.outstandingAmount,
        daysOutstanding,
        status: sale.status,
      });
    }

    for (const appointment of outstandingAppointments) {
      const daysOutstanding = Math.floor(
        (now - appointment.appointmentDate) / (1000 * 60 * 60 * 24)
      );

      outstandingInvoices.push({
        type: "CLINIC",
        id: appointment._id,
        invoiceNumber: appointment.appointmentNumber,
        invoiceDate: appointment.appointmentDate,
        dueDate: undefined,
        totalAmount: appointment.totalAmount,
        paidAmount: appointment.paidAmount,
        outstandingAmount: appointment.outstandingAmount,
        daysOutstanding,
        status: appointment.status,
      });
    }

    // Sort by oldest first
    outstandingInvoices.sort((a, b) => a.invoiceDate - b.invoiceDate);

    // Calculate summary
    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.outstandingAmount,
      0
    );

    const oldestInvoiceDate =
      outstandingInvoices.length > 0
        ? outstandingInvoices[0].invoiceDate
        : undefined;

    const averageDaysOutstanding =
      outstandingInvoices.length > 0
        ? outstandingInvoices.reduce((sum, inv) => sum + inv.daysOutstanding, 0) /
        outstandingInvoices.length
        : 0;

    // Get payment history if requested
    let paymentHistory: any[] | undefined;

    if (args.includeHistory) {
      // Get sale payments
      const salePayments = await ctx.db
        .query("salePayments")
        .collect()
        .then((payments) =>
          payments.filter((p) => {
            const sale = sales.find((s) => s._id === p.saleId);
            return sale && !p.deletedAt;
          })
        );

      // Get clinic payments
      const clinicPayments = await ctx.db
        .query("clinicPayments")
        .collect()
        .then((payments) =>
          payments.filter((p) => {
            const appointment = appointments.find(
              (a) => a._id === p.appointmentId
            );
            return appointment && !p.deletedAt;
          })
        );

      paymentHistory = [
        ...salePayments.map((p) => ({
          paymentDate: p.paymentDate,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          notes: p.notes,
        })),
        ...clinicPayments.map((p) => ({
          paymentDate: p.paymentDate,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          notes: p.notes,
        })),
      ].sort((a, b) => b.paymentDate - a.paymentDate);
    }

    return {
      customer,
      summary: {
        totalOutstanding,
        invoiceCount: outstandingInvoices.length,
        oldestInvoiceDate,
        averageDaysOutstanding,
      },
      outstandingInvoices,
      paymentHistory,
    };
  },
});

// Get collection metrics
export const getCollectionMetrics = query({
  args: {
    branchId: v.optional(v.id("branches")),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    metrics: v.object({
      totalSales: v.number(),
      totalCollected: v.number(),
      collectionRate: v.number(), // %
      averageDaysToCollect: v.number(),
      outstandingAtPeriodEnd: v.number(),
      newAR: v.number(), // New receivables in period
      collectedAR: v.number(), // Old receivables collected
    }),
    topCollectors: v.array(
      v.object({
        customerId: v.id("customers"),
        customerName: v.string(),
        totalPaid: v.number(),
        paymentCount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get sales in period
    let sales = await ctx.db.query("sales").collect();

    if (args.branchId) {
      sales = sales.filter((s) => s.branchId === args.branchId);
    }

    const periodSales = sales.filter(
      (s) =>
        !s.deletedAt &&
        s.status === "Completed" &&
        s.saleDate >= args.startDate &&
        s.saleDate <= args.endDate
    );

    const totalSales = periodSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const newAR = periodSales.reduce((sum, s) => sum + s.outstandingAmount, 0);

    // Get payments in period
    const allPayments = await ctx.db.query("salePayments").collect();

    let periodPayments = allPayments.filter(
      (p) =>
        !p.deletedAt &&
        p.paymentDate >= args.startDate &&
        p.paymentDate <= args.endDate
    );

    // Filter by branch if specified
    if (args.branchId) {
      periodPayments = await Promise.all(
        periodPayments.map(async (p) => {
          const sale = await ctx.db.get(p.saleId);
          return sale && sale.branchId === args.branchId ? p : null;
        })
      ).then((payments) => payments.filter((p) => p !== null) as typeof periodPayments);
    }

    const totalCollected = periodPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate collection rate
    const collectionRate =
      totalSales > 0 ? ((totalCollected / totalSales) * 100) : 0;

    // Calculate average days to collect (for fully paid invoices)
    const fullyPaidSales = periodSales.filter((s) => s.outstandingAmount === 0);

    let totalDaysToCollect = 0;
    let countFullyPaid = 0;

    for (const sale of fullyPaidSales) {
      const salePayments = allPayments.filter((p) => p.saleId === sale._id);
      if (salePayments.length > 0) {
        const lastPaymentDate = Math.max(
          ...salePayments.map((p) => p.paymentDate)
        );
        const daysToCollect = Math.floor(
          (lastPaymentDate - sale.saleDate) / (1000 * 60 * 60 * 24)
        );
        totalDaysToCollect += daysToCollect;
        countFullyPaid++;
      }
    }

    const averageDaysToCollect =
      countFullyPaid > 0 ? totalDaysToCollect / countFullyPaid : 0;

    // Get outstanding at period end
    const allSalesUpToPeriod = sales.filter(
      (s) =>
        !s.deletedAt &&
        s.status === "Completed" &&
        s.saleDate <= args.endDate
    );

    const outstandingAtPeriodEnd = allSalesUpToPeriod.reduce(
      (sum, s) => sum + s.outstandingAmount,
      0
    );

    // Calculate collected AR (payments on old receivables)
    const collectedAR = totalCollected - (totalSales - newAR);

    // Top collectors (customers who paid most in period)
    const customerPaymentMap = new Map<
      string,
      { totalPaid: number; paymentCount: number; customerName: string }
    >();

    for (const payment of periodPayments) {
      const sale = await ctx.db.get(payment.saleId);
      if (!sale) continue;

      const customer = await ctx.db.get(sale.customerId);
      if (!customer) continue;

      const existing = customerPaymentMap.get(sale.customerId) || {
        totalPaid: 0,
        paymentCount: 0,
        customerName: customer.name,
      };

      existing.totalPaid += payment.amount;
      existing.paymentCount += 1;

      customerPaymentMap.set(sale.customerId, existing);
    }

    const topCollectors = Array.from(customerPaymentMap.entries())
      .map(([customerId, data]) => ({
        customerId: customerId as any,
        ...data,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 10);

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      metrics: {
        totalSales,
        totalCollected,
        collectionRate,
        averageDaysToCollect,
        outstandingAtPeriodEnd,
        newAR,
        collectedAR,
      },
      topCollectors,
    };
  },
});

// Get overdue invoices (for alerts/reminders)
export const getOverdueInvoices = query({
  args: {
    branchId: v.optional(v.id("branches")),
    daysOverdue: v.optional(v.number()), // Minimum days overdue (default 30)
  },
  returns: v.array(
    v.object({
      type: v.string(),
      id: v.string(),
      invoiceNumber: v.string(),
      invoiceDate: v.number(),
      customerId: v.id("customers"),
      customerName: v.string(),
      customerPhone: v.optional(v.string()),
      totalAmount: v.number(),
      outstandingAmount: v.number(),
      daysOverdue: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const minDaysOverdue = args.daysOverdue || 30;
    const now = Date.now();

    // Get overdue sales
    let sales = await ctx.db.query("sales").collect();

    if (args.branchId) {
      sales = sales.filter((s) => s.branchId === args.branchId);
    }

    const overdueSales = sales.filter((s) => {
      if (s.deletedAt || s.status !== "Completed" || s.outstandingAmount <= 0) {
        return false;
      }

      const daysOverdue = Math.floor(
        (now - s.saleDate) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue >= minDaysOverdue;
    });

    // Get overdue appointments
    let appointments = await ctx.db.query("clinicAppointments").collect();

    if (args.branchId) {
      appointments = appointments.filter((a) => a.branchId === args.branchId);
    }

    const overdueAppointments = appointments.filter((a) => {
      if (a.deletedAt || a.status !== "Completed" || a.outstandingAmount <= 0) {
        return false;
      }

      const daysOverdue = Math.floor(
        (now - a.appointmentDate) / (1000 * 60 * 60 * 24)
      );
      return daysOverdue >= minDaysOverdue;
    });

    // Build overdue list
    const overdueInvoices: any[] = [];

    for (const sale of overdueSales) {
      const customer = await ctx.db.get(sale.customerId);
      if (!customer) continue;

      const daysOverdue = Math.floor(
        (now - sale.saleDate) / (1000 * 60 * 60 * 24)
      );

      overdueInvoices.push({
        type: "SALE",
        id: sale._id,
        invoiceNumber: sale.saleNumber,
        invoiceDate: sale.saleDate,
        customerId: sale.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalAmount: sale.totalAmount,
        outstandingAmount: sale.outstandingAmount,
        daysOverdue,
      });
    }

    for (const appointment of overdueAppointments) {
      const customer = await ctx.db.get(appointment.customerId);
      if (!customer) continue;

      const daysOverdue = Math.floor(
        (now - appointment.appointmentDate) / (1000 * 60 * 60 * 24)
      );

      overdueInvoices.push({
        type: "CLINIC",
        id: appointment._id,
        invoiceNumber: appointment.appointmentNumber,
        invoiceDate: appointment.appointmentDate,
        customerId: appointment.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalAmount: appointment.totalAmount,
        outstandingAmount: appointment.outstandingAmount,
        daysOverdue,
      });
    }

    // Sort by days overdue descending
    overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return overdueInvoices;
  },
});



