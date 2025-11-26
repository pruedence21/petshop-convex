import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Create expense category
export const create = mutation({
  args: {
    categoryName: v.string(),
    linkedAccountId: v.id("accounts"), // Link to expense account in CoA
    requiresApproval: v.boolean(),
    approvalThreshold: v.optional(v.number()), // Amount requiring approval
    description: v.optional(v.string()),
  },
  returns: v.id("expenseCategories"),
  handler: async (ctx, args) => {
    // Validate linked account
    const account = await ctx.db.get(args.linkedAccountId);
    if (!account || account.deletedAt || account.accountType !== "EXPENSE") {
      throw new Error("Invalid expense account");
    }

    // Check uniqueness
    const existing = await ctx.db
      .query("expenseCategories")
      .withIndex("by_category_name", (q) =>
        q.eq("categoryName", args.categoryName)
      )
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error(`Expense category ${args.categoryName} already exists`);
    }

    const categoryId = await ctx.db.insert("expenseCategories", {
      categoryName: args.categoryName,
      linkedAccountId: args.linkedAccountId,
      requiresApproval: args.requiresApproval,
      approvalThreshold: args.approvalThreshold,
      description: args.description,
      isActive: true,
      createdBy: undefined,
    });

    return categoryId;
  },
});

// List expense categories
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("expenseCategories"),
      _creationTime: v.number(),
      categoryName: v.string(),
      linkedAccountId: v.id("accounts"),
      requiresApproval: v.boolean(),
      approvalThreshold: v.optional(v.number()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      linkedAccount: v.any(),
    })
  ),
  handler: async (ctx, args) => {
    const categories = await ctx.db.query("expenseCategories").collect();

    let filtered = categories.filter((c) => !c.deletedAt);
    if (!args.includeInactive) {
      filtered = filtered.filter((c) => c.isActive);
    }

    const enriched = await Promise.all(
      filtered.map(async (category) => {
        const linkedAccount = await ctx.db.get(category.linkedAccountId);
        return {
          ...category,
          linkedAccount,
        };
      })
    );

    enriched.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    return enriched;
  },
});

// Update expense category
export const update = mutation({
  args: {
    id: v.id("expenseCategories"),
    categoryName: v.optional(v.string()),
    requiresApproval: v.optional(v.boolean()),
    approvalThreshold: v.optional(v.number()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.id("expenseCategories"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const category = await ctx.db.get(id);
    if (!category || category.deletedAt) {
      throw new Error("Expense category not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Soft delete expense category
export const remove = mutation({
  args: { id: v.id("expenseCategories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category || category.deletedAt) {
      throw new Error("Expense category not found");
    }

    // Check if category has expenses
    const hasExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (hasExpenses && !hasExpenses.deletedAt) {
      throw new Error(
        "Cannot delete category with existing expenses. Mark as inactive instead."
      );
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return null;
  },
});



