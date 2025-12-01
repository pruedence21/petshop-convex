import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        const customers = await ctx.db.query("customers").collect();
        const suppliers = await ctx.db.query("suppliers").collect();
        const sales = await ctx.db.query("sales").collect();

        // Calculate total revenue
        const totalRevenue = sales
            .filter(s => s.status === "Completed")
            .reduce((acc, curr) => acc + curr.totalAmount, 0);

        // Calculate today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenue = sales
            .filter(s => s.status === "Completed" && s.saleDate >= today.getTime())
            .reduce((acc, curr) => acc + curr.totalAmount, 0);

        return {
            totalProducts: products.length,
            totalCustomers: customers.length,
            totalSuppliers: suppliers.length,
            totalSales: sales.length,
            totalRevenue,
            todayRevenue,
        };
    },
});

export const getRecentSales = query({
    args: {},
    handler: async (ctx) => {
        const sales = await ctx.db
            .query("sales")
            .withIndex("by_sale_date")
            .order("desc")
            .take(5);

        // Enrich with customer names
        const salesWithCustomer = await Promise.all(
            sales.map(async (sale) => {
                const customer = await ctx.db.get(sale.customerId);
                return {
                    ...sale,
                    customerName: customer?.name || "Unknown",
                };
            })
        );

        return salesWithCustomer;
    },
});

export const getLowStockProducts = query({
    args: {},
    handler: async (ctx) => {
        // Note: This might be expensive if there are many products. 
        // Ideally we'd have an index or a separate table for low stock alerts.
        // For now, we'll fetch all products and filter in memory as per current scale.
        const products = await ctx.db.query("products").collect();

        // We need to check stock per branch, but for dashboard overview we might just want global low stock or specific branch?
        // Let's assume we want to show products that are low in ANY branch for now, or just check the product definition if it has a global stock concept?
        // The schema has `productStock` table.

        const allStock = await ctx.db.query("productStock").collect();

        const lowStockItems = [];

        for (const stock of allStock) {
            const product = products.find(p => p._id === stock.productId);
            if (product && stock.quantity <= product.minStock) {
                const branch = await ctx.db.get(stock.branchId);
                lowStockItems.push({
                    productName: product.name,
                    branchName: branch?.name || "Unknown",
                    quantity: stock.quantity,
                    minStock: product.minStock,
                    sku: product.sku
                });
            }
        }

        return lowStockItems.slice(0, 10); // Limit to 10
    },
});

export const getSalesChartData = query({
    args: {},
    handler: async (ctx) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const sales = await ctx.db
            .query("sales")
            .withIndex("by_sale_date", (q) => q.gte("saleDate", sevenDaysAgo.getTime()))
            .collect();

        // Group by date
        const salesByDate = new Map<string, number>();

        // Initialize last 7 days with 0
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesByDate.set(dateStr, 0);
        }

        sales.forEach(sale => {
            if (sale.status === "Completed") {
                const dateStr = new Date(sale.saleDate).toISOString().split('T')[0];
                const current = salesByDate.get(dateStr) || 0;
                salesByDate.set(dateStr, current + sale.totalAmount);
            }
        });

        // Convert to array and sort
        return Array.from(salesByDate.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));
    },
});
