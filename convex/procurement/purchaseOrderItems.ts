import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { purchaseOrderId: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) =>
        q.eq("purchaseOrderId", args.purchaseOrderId)
      )
      .collect();

    // Enrich with product and variant details
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        let variant = null;
        if (item.variantId) {
          variant = await ctx.db.get(item.variantId);
        }

        return {
          ...item,
          product,
          variant,
        };
      })
    );

    return enrichedItems;
  },
});

// Get item by ID
export const get = query({
  args: { id: v.id("purchaseOrderItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    const product = await ctx.db.get(item.productId);
    let variant = null;
    if (item.variantId) {
      variant = await ctx.db.get(item.variantId);
    }

    return {
      ...item,
      product,
      variant,
    };
  },
});



