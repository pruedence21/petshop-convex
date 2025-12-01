import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Accounts Payable (AP) Dashboard & Reports
 * 
 * Provides comprehensive AP tracking including:
 * - Aging reports (0-30, 31-60, 61-90, 90+ days)
 * - Supplier outstanding summary
 * - Payment history
 */

// Get AP Aging Report
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
            totalSuppliers: v.number(),
            suppliersWithBalance: v.number(),
        }),
        supplierAging: v.array(
            v.object({
                supplierId: v.id("suppliers"),
                supplierName: v.string(),
                phone: v.optional(v.string()),
                totalOutstanding: v.number(),
                current: v.number(),
                days31to60: v.number(),
                days61to90: v.number(),
                over90days: v.number(),
                oldestBillDate: v.optional(v.number()),
                billCount: v.number(),
            })
        ),
    }),
    handler: async (ctx, args) => {
        const asOfDate = args.asOfDate || Date.now();

        // Get all purchase orders with outstanding balances
        let pos = await ctx.db.query("purchaseOrders").collect();

        // Filter by branch
        if (args.branchId) {
            pos = pos.filter((p) => p.branchId === args.branchId);
        }

        // Filter submitted/received POs with outstanding amounts
        const outstandingPOs = pos.filter(
            (p) =>
                !p.deletedAt &&
                (p.status === "Submitted" || p.status === "Received") &&
                p.outstandingAmount > 0 &&
                p.orderDate <= asOfDate
        );

        // Calculate aging
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

        // Group by supplier
        const supplierMap = new Map<
            string,
            {
                supplierId: string;
                supplierName: string;
                phone?: string;
                totalOutstanding: number;
                current: number;
                days31to60: number;
                days61to90: number;
                over90days: number;
                oldestBillDate?: number;
                billCount: number;
            }
        >();

        for (const po of outstandingPOs) {
            const supplier = await ctx.db.get(po.supplierId);
            if (!supplier) continue;

            const aging = calculateAging(po.orderDate);
            const existing = supplierMap.get(po.supplierId) || {
                supplierId: po.supplierId,
                supplierName: supplier.name,
                phone: supplier.phone,
                totalOutstanding: 0,
                current: 0,
                days31to60: 0,
                days61to90: 0,
                over90days: 0,
                oldestBillDate: po.orderDate,
                billCount: 0,
            };

            let amount = po.outstandingAmount;
            if (aging.current) existing.current += amount;
            if (aging.days31to60) existing.days31to60 += amount;
            if (aging.days61to90) existing.days61to90 += amount;
            if (aging.over90days) existing.over90days += amount;

            existing.totalOutstanding += amount;
            existing.billCount += 1;

            if (
                !existing.oldestBillDate ||
                po.orderDate < existing.oldestBillDate
            ) {
                existing.oldestBillDate = po.orderDate;
            }

            supplierMap.set(po.supplierId, existing);
        }

        // Convert map to array
        const supplierAging = Array.from(supplierMap.values()).sort(
            (a, b) => b.totalOutstanding - a.totalOutstanding
        );

        // Calculate summary
        const summary = {
            totalOutstanding: supplierAging.reduce(
                (sum, s) => sum + s.totalOutstanding,
                0
            ),
            current: supplierAging.reduce((sum, s) => sum + s.current, 0),
            days31to60: supplierAging.reduce((sum, s) => sum + s.days31to60, 0),
            days61to90: supplierAging.reduce((sum, s) => sum + s.days61to90, 0),
            over90days: supplierAging.reduce((sum, s) => sum + s.over90days, 0),
            totalSuppliers: await ctx.db.query("suppliers").collect().then((suppliers) => suppliers.filter(s => !s.deletedAt).length),
            suppliersWithBalance: supplierAging.length,
        };

        return {
            asOfDate,
            summary,
            supplierAging: supplierAging.map((s) => ({
                ...s,
                supplierId: s.supplierId as any,
            })),
        };
    },
});

// Get supplier outstanding detail
export const getSupplierOutstanding = query({
    args: {
        supplierId: v.id("suppliers"),
        includeHistory: v.optional(v.boolean()),
    },
    returns: v.object({
        supplier: v.any(),
        summary: v.object({
            totalOutstanding: v.number(),
            billCount: v.number(),
            oldestBillDate: v.optional(v.number()),
            averageDaysOutstanding: v.number(),
        }),
        outstandingBills: v.array(
            v.object({
                id: v.string(),
                billNumber: v.string(),
                billDate: v.number(),
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
        const supplier = await ctx.db.get(args.supplierId);
        if (!supplier || supplier.deletedAt) {
            throw new Error("Supplier not found");
        }

        // Get outstanding POs
        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId))
            .collect();

        const outstandingPOs = pos.filter(
            (p) =>
                !p.deletedAt &&
                (p.status === "Submitted" || p.status === "Received") &&
                p.outstandingAmount > 0
        );

        const now = Date.now();

        // Build outstanding bills list
        const outstandingBills = outstandingPOs.map((po) => {
            const daysOutstanding = Math.floor(
                (now - po.orderDate) / (1000 * 60 * 60 * 24)
            );

            return {
                id: po._id,
                billNumber: po.poNumber,
                billDate: po.orderDate,
                dueDate: po.dueDate,
                totalAmount: po.totalAmount,
                paidAmount: po.paidAmount,
                outstandingAmount: po.outstandingAmount,
                daysOutstanding,
                status: po.status,
            };
        });

        // Sort by oldest first
        outstandingBills.sort((a, b) => a.billDate - b.billDate);

        // Calculate summary
        const totalOutstanding = outstandingBills.reduce(
            (sum, bill) => sum + bill.outstandingAmount,
            0
        );

        const oldestBillDate =
            outstandingBills.length > 0
                ? outstandingBills[0].billDate
                : undefined;

        const averageDaysOutstanding =
            outstandingBills.length > 0
                ? outstandingBills.reduce((sum, bill) => sum + bill.daysOutstanding, 0) /
                outstandingBills.length
                : 0;

        // Get payment history if requested
        let paymentHistory: any[] | undefined;

        if (args.includeHistory) {
            const payments = await ctx.db
                .query("purchaseOrderPayments")
                .collect();

            // Filter manually since we don't have index by supplier on payments (it's on PO)
            // This might be slow if many payments, but okay for now
            const supplierPayments = [];
            for (const payment of payments) {
                if (payment.deletedAt) continue;
                const po = pos.find(p => p._id === payment.purchaseOrderId);
                if (po) {
                    supplierPayments.push({
                        paymentDate: payment.paymentDate,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        referenceNumber: payment.referenceNumber,
                        notes: payment.notes,
                    });
                }
            }

            paymentHistory = supplierPayments.sort((a, b) => b.paymentDate - a.paymentDate);
        }

        return {
            supplier,
            summary: {
                totalOutstanding,
                billCount: outstandingBills.length,
                oldestBillDate,
                averageDaysOutstanding,
            },
            outstandingBills,
            paymentHistory,
        };
    },
});
