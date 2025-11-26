import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { calculateLine } from "../../lib/finance";
import { updateStockFromPurchaseHelper } from "../inventory/productStock";
import { createPurchaseJournalEntry } from "../finance/accountingHelpers";

// Generate PO Number (PO-YYYYMMDD-001)
async function generatePONumber(ctx: any): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `PO-${dateStr}-`;

  // Find last PO of today
  const todayPOs = await ctx.db
    .query("purchaseOrders")
    .withIndex("by_po_number")
    .collect();

  const todayFiltered = todayPOs.filter((po: any) =>
    po.poNumber.startsWith(prefix)
  );

  if (todayFiltered.length === 0) {
    return `${prefix}001`;
  }

  // Get max number
  const maxNumber = Math.max(
    ...todayFiltered.map((po: any) => {
      const numPart = po.poNumber.split("-")[2];
      return parseInt(numPart, 10);
    })
  );

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

// Create purchase order (Draft status)
export const create = mutation({
  args: {
    supplierId: v.id("suppliers"),
    branchId: v.id("branches"),
    orderDate: v.number(),
    expectedDeliveryDate: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const poNumber = await generatePONumber(ctx);

    const poId = await ctx.db.insert("purchaseOrders", {
      poNumber,
      supplierId: args.supplierId,
      branchId: args.branchId,
      orderDate: args.orderDate,
      expectedDeliveryDate: args.expectedDeliveryDate,
      status: "Draft",
      totalAmount: 0, // Will be calculated when items are added
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    return { poId, poNumber };
  },
});

// Add item to purchase order
export const addItem = mutation({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    unitPrice: v.number(),
    discount: v.optional(v.number()),
    tax: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Draft") throw new Error("Can only add items to draft PO");

    // Calculate line item using finance.ts
    const lineCalc = calculateLine({
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      discountAmount: args.discount || 0,
      discountPercent: 0,
      taxPercent: 0,
    });
    const subtotal = lineCalc.net + (args.tax || 0); // Add tax as flat amount

    const itemId = await ctx.db.insert("purchaseOrderItems", {
      purchaseOrderId: args.purchaseOrderId,
      productId: args.productId,
      variantId: args.variantId,
      quantity: args.quantity,
      receivedQuantity: 0,
      unitPrice: args.unitPrice,
      discount: args.discount || 0,
      tax: args.tax || 0,
      subtotal,
      notes: args.notes,
    });

    // Recalculate PO total
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) =>
        q.eq("purchaseOrderId", args.purchaseOrderId)
      )
      .collect();

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    await ctx.db.patch(args.purchaseOrderId, {
      totalAmount,
      updatedBy: undefined,
    });

    return itemId;
  },
});

// Update item in purchase order
export const updateItem = mutation({
  args: {
    itemId: v.id("purchaseOrderItems"),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    tax: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const po = await ctx.db.get(item.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Draft") throw new Error("Can only update items in draft PO");

    const quantity = args.quantity ?? item.quantity;
    const unitPrice = args.unitPrice ?? item.unitPrice;
    const discount = args.discount ?? item.discount ?? 0;
    const tax = args.tax ?? item.tax ?? 0;

    // Calculate line item using finance.ts
    const lineCalc = calculateLine({
      quantity,
      unitPrice,
      discountAmount: discount,
      discountPercent: 0,
      taxPercent: 0,
    });
    const subtotal = lineCalc.net + tax; // Add tax as flat amount

    await ctx.db.patch(args.itemId, {
      quantity,
      unitPrice,
      discount,
      tax,
      subtotal,
      notes: args.notes ?? item.notes,
    });

    // Recalculate PO total
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) =>
        q.eq("purchaseOrderId", item.purchaseOrderId)
      )
      .collect();

    const totalAmount = items.reduce((sum, it) =>
      sum + (it._id === args.itemId ? subtotal : it.subtotal), 0
    );

    await ctx.db.patch(item.purchaseOrderId, {
      totalAmount,
      updatedBy: undefined,
    });

    return args.itemId;
  },
});

// Remove item from purchase order
export const removeItem = mutation({
  args: {
    itemId: v.id("purchaseOrderItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const po = await ctx.db.get(item.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Draft") throw new Error("Can only remove items from draft PO");

    await ctx.db.delete(args.itemId);

    // Recalculate PO total
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) =>
        q.eq("purchaseOrderId", item.purchaseOrderId)
      )
      .collect();

    const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);

    await ctx.db.patch(item.purchaseOrderId, {
      totalAmount,
      updatedBy: undefined,
    });

    return item.purchaseOrderId;
  },
});

// Submit purchase order (Draft → Submitted)
export const submit = mutation({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Draft") throw new Error("Can only submit draft PO");

    // Check if PO has items
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) =>
        q.eq("purchaseOrderId", args.purchaseOrderId)
      )
      .collect();

    if (items.length === 0) {
      throw new Error("Cannot submit PO without items");
    }

    await ctx.db.patch(args.purchaseOrderId, {
      status: "Submitted",
      updatedBy: undefined,
    });

    return args.purchaseOrderId;
  },
});

// Receive goods (partial or full)
export const receive = mutation({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
    receivedItems: v.array(
      v.object({
        itemId: v.id("purchaseOrderItems"),
        receivedQuantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Submitted" && po.status !== "Received") {
      throw new Error("Can only receive submitted PO");
    }

    let allItemsFullyReceived = true;

    for (const receivedItem of args.receivedItems) {
      const item = await ctx.db.get(receivedItem.itemId);
      if (!item) throw new Error(`Item ${receivedItem.itemId} not found`);
      if (item.purchaseOrderId !== args.purchaseOrderId) {
        throw new Error("Item does not belong to this PO");
      }

      const newReceivedQty = item.receivedQuantity + receivedItem.receivedQuantity;

      if (newReceivedQty > item.quantity) {
        throw new Error(`Cannot receive more than ordered quantity for item ${receivedItem.itemId}`);
      }

      // Update item received quantity
      await ctx.db.patch(receivedItem.itemId, {
        receivedQuantity: newReceivedQty,
      });

      // Update stock using helper function
      await updateStockFromPurchaseHelper(ctx, {
        branchId: po.branchId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: receivedItem.receivedQuantity,
        unitPrice: item.unitPrice,
        purchaseOrderId: args.purchaseOrderId,
      });

      // Check if this item is fully received
      if (newReceivedQty < item.quantity) {
        allItemsFullyReceived = false;
      }
    }

    // Update PO status
    const newStatus = allItemsFullyReceived ? "Received" : "Submitted";
    await ctx.db.patch(args.purchaseOrderId, {
      status: newStatus,
      updatedBy: undefined,
    });

    // Create journal entry for accounting integration (only when fully received)
    if (allItemsFullyReceived) {
      try {
        // Get all items for journal entry
        const allItems = await ctx.db
          .query("purchaseOrderItems")
          .withIndex("by_purchase_order", (q) =>
            q.eq("purchaseOrderId", args.purchaseOrderId)
          )
          .collect();

        const itemsData = await Promise.all(
          allItems.map(async (item) => {
            const product = await ctx.db.get(item.productId);

            // Get category name
            let categoryName = "Pet Food"; // Default
            if (product?.categoryId) {
              const category = await ctx.db.get(product.categoryId);
              categoryName = category?.name || "Pet Food";
            }

            return {
              productName: product?.name || "Unknown Product",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              category: categoryName,
            };
          })
        );

        await createPurchaseJournalEntry(ctx, {
          purchaseOrderId: args.purchaseOrderId,
          poNumber: po.poNumber,
          orderDate: po.orderDate,
          branchId: po.branchId,
          totalAmount: po.totalAmount,
          items: itemsData,
          taxAmount: 0, // TODO: Calculate if needed
          paid: false, // Default to accounts payable
        });
      } catch (error: any) {
        // Log error but don't fail the receiving process
        console.error("Failed to create journal entry:", error.message);
      }
    }

    return { purchaseOrderId: args.purchaseOrderId, status: newStatus };
  },
});

// Cancel purchase order
export const cancel = mutation({
  args: {
    purchaseOrderId: v.id("purchaseOrders"),
  },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status === "Received") {
      throw new Error("Cannot cancel received PO");
    }

    await ctx.db.patch(args.purchaseOrderId, {
      status: "Cancelled",
      updatedBy: undefined,
    });

    return args.purchaseOrderId;
  },
});

// List purchase orders with filters
export const list = query({
  args: {
    status: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    supplierId: v.optional(v.id("suppliers")),
  },
  handler: async (ctx, args) => {
    let pos;

    if (args.status) {
      pos = await ctx.db
        .query("purchaseOrders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.branchId) {
      pos = await ctx.db
        .query("purchaseOrders")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .order("desc")
        .collect();
    } else if (args.supplierId) {
      pos = await ctx.db
        .query("purchaseOrders")
        .withIndex("by_supplier", (q) => q.eq("supplierId", args.supplierId!))
        .order("desc")
        .collect();
    } else {
      pos = await ctx.db
        .query("purchaseOrders")
        .withIndex("by_order_date")
        .order("desc")
        .collect();
    }

    // Filter out deleted
    const filtered = pos.filter((po) => !po.deletedAt);

    // Enrich with supplier and branch details
    const enriched = await Promise.all(
      filtered.map(async (po) => {
        const supplier = await ctx.db.get(po.supplierId);
        const branch = await ctx.db.get(po.branchId);

        // Count items
        const items = await ctx.db
          .query("purchaseOrderItems")
          .withIndex("by_purchase_order", (q) => q.eq("purchaseOrderId", po._id))
          .collect();

        return {
          ...po,
          supplier,
          branch,
          itemCount: items.length,
        };
      })
    );

    return enriched;
  },
});

// Get purchase order by ID with items
export const get = query({
  args: { id: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.id);
    if (!po || po.deletedAt) return null;

    const supplier = await ctx.db.get(po.supplierId);
    const branch = await ctx.db.get(po.branchId);

    // Get items with product details
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_purchase_order", (q) => q.eq("purchaseOrderId", args.id))
      .collect();

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

    return {
      ...po,
      supplier,
      branch,
      items: enrichedItems,
    };
  },
});

// Delete purchase order (soft delete)
export const remove = mutation({
  args: { id: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    const po = await ctx.db.get(args.id);
    if (!po) throw new Error("Purchase order not found");
    if (po.status !== "Draft" && po.status !== "Cancelled") {
      throw new Error("Can only delete draft or cancelled PO");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return args.id;
  },
});



