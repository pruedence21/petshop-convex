import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Create account
export const create = mutation({
  args: {
    accountCode: v.string(),
    accountName: v.string(),
    accountType: v.string(), // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    category: v.string(),
    parentAccountId: v.optional(v.id("accounts")),
    normalBalance: v.string(), // DEBIT or CREDIT
    description: v.optional(v.string()),
    isHeader: v.boolean(),
    level: v.number(),
    taxable: v.optional(v.boolean()),
  },
  returns: v.id("accounts"),
  handler: async (ctx, args) => {
    // Validate account code uniqueness
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", args.accountCode))
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error(`Account code ${args.accountCode} already exists`);
    }

    // Validate parent if provided
    if (args.parentAccountId) {
      const parent = await ctx.db.get(args.parentAccountId);
      if (!parent || parent.deletedAt) {
        throw new Error("Parent account not found");
      }
      if (!parent.isHeader) {
        throw new Error("Parent account must be a header account");
      }
    }

    const accountId = await ctx.db.insert("accounts", {
      accountCode: args.accountCode,
      accountName: args.accountName,
      accountType: args.accountType,
      category: args.category,
      parentAccountId: args.parentAccountId,
      normalBalance: args.normalBalance,
      description: args.description,
      isHeader: args.isHeader,
      isActive: true,
      level: args.level,
      taxable: args.taxable,
      createdBy: undefined, // TODO: auth integration
    });

    return accountId;
  },
});

// Update account
export const update = mutation({
  args: {
    id: v.id("accounts"),
    accountName: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    taxable: v.optional(v.boolean()),
  },
  returns: v.id("accounts"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const account = await ctx.db.get(id);
    if (!account || account.deletedAt) {
      throw new Error("Account not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Soft delete account
export const remove = mutation({
  args: { id: v.id("accounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.id);
    if (!account || account.deletedAt) {
      throw new Error("Account not found");
    }

    // Check if account has transactions
    const hasTransactions = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .first();

    if (hasTransactions) {
      throw new Error(
        "Cannot delete account with transactions. Deactivate instead."
      );
    }

    // Check if account has children
    const hasChildren = await ctx.db
      .query("accounts")
      .withIndex("by_parent", (q) => q.eq("parentAccountId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (hasChildren) {
      throw new Error("Cannot delete account with sub-accounts");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return null;
  },
});

// List accounts with hierarchy
export const list = query({
  args: {
    accountType: v.optional(v.string()),
    parentAccountId: v.optional(v.union(v.id("accounts"), v.null())),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("accounts"),
      _creationTime: v.number(),
      accountCode: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      category: v.string(),
      parentAccountId: v.optional(v.id("accounts")),
      normalBalance: v.string(),
      description: v.optional(v.string()),
      isHeader: v.boolean(),
      isActive: v.boolean(),
      level: v.number(),
      taxable: v.optional(v.boolean()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      balance: v.optional(v.number()), // Calculated balance
      childCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let accounts;

    if (args.accountType) {
      accounts = await ctx.db
        .query("accounts")
        .withIndex("by_account_type", (q) => q.eq("accountType", args.accountType!))
        .collect();
    } else if (args.parentAccountId !== undefined) {
      if (args.parentAccountId === null) {
        // Root level accounts
        accounts = await ctx.db.query("accounts").collect();
        accounts = accounts.filter((a) => !a.parentAccountId);
      } else {
        accounts = await ctx.db
          .query("accounts")
          .withIndex("by_parent", (q) => q.eq("parentAccountId", args.parentAccountId!))
          .collect();
      }
    } else {
      accounts = await ctx.db.query("accounts").collect();
    }

    // Filter deleted and inactive
    let filtered = accounts.filter((a) => !a.deletedAt);
    if (!args.includeInactive) {
      filtered = filtered.filter((a) => a.isActive);
    }

    // Sort by account code
    filtered.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Enrich with child count
    const enriched = await Promise.all(
      filtered.map(async (account) => {
        const children = await ctx.db
          .query("accounts")
          .withIndex("by_parent", (q) => q.eq("parentAccountId", account._id))
          .collect();

        const activeChildren = children.filter((c) => !c.deletedAt);

        return {
          ...account,
          childCount: activeChildren.length,
        };
      })
    );

    return enriched;
  },
});

// Get account by ID
export const get = query({
  args: { id: v.id("accounts") },
  returns: v.union(
    v.object({
      _id: v.id("accounts"),
      _creationTime: v.number(),
      accountCode: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      category: v.string(),
      parentAccountId: v.optional(v.id("accounts")),
      normalBalance: v.string(),
      description: v.optional(v.string()),
      isHeader: v.boolean(),
      isActive: v.boolean(),
      level: v.number(),
      taxable: v.optional(v.boolean()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      parent: v.optional(v.any()),
      balance: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.id);
    if (!account || account.deletedAt) return null;

    // Get parent if exists
    let parent = null;
    if (account.parentAccountId) {
      parent = await ctx.db.get(account.parentAccountId);
    }

    // Calculate balance (sum of journal entry lines)
    const lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .collect();

    // Get only posted journal entries
    const postedLines = await Promise.all(
      lines.map(async (line) => {
        const je = await ctx.db.get(line.journalEntryId);
        if (je && je.status === "Posted") {
          return line;
        }
        return null;
      })
    );

    const validLines = postedLines.filter((l) => l !== null) as typeof lines;

    const balance = validLines.reduce((sum, line) => {
      if (account.normalBalance === "DEBIT") {
        return sum + line.debitAmount - line.creditAmount;
      } else {
        return sum + line.creditAmount - line.debitAmount;
      }
    }, 0);

    return {
      ...account,
      parent,
      balance,
    };
  },
});

// Get account by code
export const getByCode = query({
  args: { accountCode: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("accounts"),
      _creationTime: v.number(),
      accountCode: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      category: v.string(),
      parentAccountId: v.optional(v.id("accounts")),
      normalBalance: v.string(),
      description: v.optional(v.string()),
      isHeader: v.boolean(),
      isActive: v.boolean(),
      level: v.number(),
      taxable: v.optional(v.boolean()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", args.accountCode))
      .first();

    if (!account || account.deletedAt) return null;

    return account;
  },
});

// Get account hierarchy tree
export const getTree = query({
  args: {
    accountType: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let accounts;

    if (args.accountType) {
      accounts = await ctx.db
        .query("accounts")
        .withIndex("by_account_type", (q) => q.eq("accountType", args.accountType!))
        .collect();
    } else {
      accounts = await ctx.db.query("accounts").collect();
    }

    const filtered = accounts.filter((a) => !a.deletedAt && a.isActive);

    // Build tree structure
    const buildTree = (parentId: Id<"accounts"> | undefined): any[] => {
      return filtered
        .filter((a) => a.parentAccountId === parentId)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
        .map((account) => ({
          ...account,
          children: buildTree(account._id),
        }));
    };

    return buildTree(undefined);
  },
});

// Search accounts
export const search = query({
  args: {
    query: v.string(),
    accountType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("accounts"),
      _creationTime: v.number(),
      accountCode: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      category: v.string(),
      parentAccountId: v.optional(v.id("accounts")),
      normalBalance: v.string(),
      description: v.optional(v.string()),
      isHeader: v.boolean(),
      isActive: v.boolean(),
      level: v.number(),
      taxable: v.optional(v.boolean()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let accounts;

    if (args.accountType) {
      accounts = await ctx.db
        .query("accounts")
        .withIndex("by_account_type", (q) => q.eq("accountType", args.accountType!))
        .collect();
    } else {
      accounts = await ctx.db.query("accounts").collect();
    }

    const filtered = accounts.filter((a) => !a.deletedAt && a.isActive);

    // Search by code or name
    const searchTerm = args.query.toLowerCase();
    const results = filtered.filter(
      (a) =>
        a.accountCode.toLowerCase().includes(searchTerm) ||
        a.accountName.toLowerCase().includes(searchTerm)
    );

    const limited = args.limit ? results.slice(0, args.limit) : results;

    return limited.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  },
});



