import { query } from "../_generated/server";
import { v } from "convex/values";

// Get expiring items
export const getExpiringItems = query({
    args: {
        branchId: v.optional(v.id("branches")),
        daysThreshold: v.optional(v.number()), // Default 30 days
    },
    handler: async (ctx, args) => {
        const daysThreshold = args.daysThreshold || 30;
        const now = Date.now();
        const thresholdDate = now + daysThreshold * 24 * 60 * 60 * 1000;

        // Query batches that are expiring soon
        // We can use the by_expiry index, but we need to filter by branch
        // Since we can't range query on expiry AND filter by branch efficiently without a specific index,
        // we might need to fetch by branch and filter, or fetch by expiry and filter.
        // Given expiry is usually a smaller set than all stock, let's try fetching by expiry range if possible?
        // But Convex range queries are on the index key.
        // Let's use the `by_expiry` index to get everything expiring soon, then filter by branch.
        // This is efficient if the total number of expiring items globally is not huge.

        const expiringBatches = await ctx.db
            .query("productStockBatches")
            .withIndex("by_expiry", (q) => q.gt("expiredDate", 0).lt("expiredDate", thresholdDate))
            .collect();

        const branchBatches = expiringBatches.filter(
            (b) => (args.branchId ? b.branchId === args.branchId : true) && b.quantity > 0
        );

        // Enrich with product details
        const enrichedItems = await Promise.all(
            branchBatches.map(async (batch) => {
                const product = await ctx.db.get(batch.productId);
                const branch = await ctx.db.get(batch.branchId);
                let variant = null;
                if (batch.variantId) {
                    variant = await ctx.db.get(batch.variantId);
                }

                return {
                    ...batch,
                    product,
                    branch,
                    variant,
                    daysUntilExpiry: Math.ceil((batch.expiredDate - now) / (24 * 60 * 60 * 1000)),
                };
            })
        );

        return enrichedItems.sort((a, b) => a.expiredDate - b.expiredDate);
    },
});
