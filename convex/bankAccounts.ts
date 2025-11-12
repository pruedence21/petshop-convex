import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create bank account
export const create = mutation({
  args: {
    accountName: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    linkedAccountId: v.id("accounts"), // Link to CoA (e.g., 1-111 Bank BCA)
    branchName: v.optional(v.string()),
    initialBalance: v.number(),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("bankAccounts"),
  handler: async (ctx, args) => {
    // Validate linked account exists
    const linkedAccount = await ctx.db.get(args.linkedAccountId);
    if (!linkedAccount || linkedAccount.deletedAt) {
      throw new Error("Linked chart of account not found");
    }

    // Validate account number uniqueness
    const existing = await ctx.db
      .query("bankAccounts")
      .withIndex("by_account_number", (q) =>
        q.eq("accountNumber", args.accountNumber)
      )
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error(`Bank account number ${args.accountNumber} already exists`);
    }

    const bankAccountId = await ctx.db.insert("bankAccounts", {
      accountName: args.accountName,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      branchName: args.branchName,
      linkedAccountId: args.linkedAccountId,
      initialBalance: args.initialBalance,
      currentBalance: args.initialBalance,
      currency: args.currency || "IDR",
      isActive: true,
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    return bankAccountId;
  },
});

// Update bank account
export const update = mutation({
  args: {
    id: v.id("bankAccounts"),
    accountName: v.optional(v.string()),
    branchName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  returns: v.id("bankAccounts"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const bankAccount = await ctx.db.get(id);
    if (!bankAccount || bankAccount.deletedAt) {
      throw new Error("Bank account not found");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Soft delete bank account
export const remove = mutation({
  args: { id: v.id("bankAccounts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bankAccount = await ctx.db.get(args.id);
    if (!bankAccount || bankAccount.deletedAt) {
      throw new Error("Bank account not found");
    }

    // Check if account has unreconciled transactions
    const hasUnreconciled = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bank_account", (q) => q.eq("bankAccountId", args.id))
      .filter((q) =>
        q.eq(q.field("reconciliationStatus"), "UNRECONCILED")
      )
      .first();

    if (hasUnreconciled) {
      throw new Error(
        "Cannot delete bank account with unreconciled transactions"
      );
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return null;
  },
});

// List bank accounts
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("bankAccounts"),
      _creationTime: v.number(),
      accountName: v.string(),
      bankName: v.string(),
      accountNumber: v.string(),
      branchName: v.optional(v.string()),
      linkedAccountId: v.id("accounts"),
      initialBalance: v.number(),
      currentBalance: v.number(),
      currency: v.string(),
      isActive: v.boolean(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      linkedAccount: v.any(),
      unreconciledCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const accounts = await ctx.db.query("bankAccounts").collect();

    // Filter deleted and inactive
    let filtered = accounts.filter((a) => !a.deletedAt);
    if (!args.includeInactive) {
      filtered = filtered.filter((a) => a.isActive);
    }

    // Enrich with linked account and unreconciled count
    const enriched = await Promise.all(
      filtered.map(async (account) => {
        const linkedAccount = await ctx.db.get(account.linkedAccountId);

        const unreconciledTransactions = await ctx.db
          .query("bankTransactions")
          .withIndex("by_bank_account", (q) =>
            q.eq("bankAccountId", account._id)
          )
          .filter((q) =>
            q.eq(q.field("reconciliationStatus"), "UNRECONCILED")
          )
          .collect();

        return {
          ...account,
          linkedAccount,
          unreconciledCount: unreconciledTransactions.length,
        };
      })
    );

    // Sort by bank name, then account name
    enriched.sort((a, b) => {
      const bankCompare = a.bankName.localeCompare(b.bankName);
      if (bankCompare !== 0) return bankCompare;
      return a.accountName.localeCompare(b.accountName);
    });

    return enriched;
  },
});

// Get bank account by ID
export const get = query({
  args: { id: v.id("bankAccounts") },
  returns: v.union(
    v.object({
      _id: v.id("bankAccounts"),
      _creationTime: v.number(),
      accountName: v.string(),
      bankName: v.string(),
      accountNumber: v.string(),
      branchName: v.optional(v.string()),
      linkedAccountId: v.id("accounts"),
      initialBalance: v.number(),
      currentBalance: v.number(),
      currency: v.string(),
      isActive: v.boolean(),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      linkedAccount: v.any(),
      unreconciledCount: v.number(),
      reconciliationSummary: v.object({
        totalTransactions: v.number(),
        reconciled: v.number(),
        unreconciled: v.number(),
        voided: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.id);
    if (!account || account.deletedAt) return null;

    const linkedAccount = await ctx.db.get(account.linkedAccountId);

    // Get transaction counts by status
    const allTransactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bank_account", (q) => q.eq("bankAccountId", args.id))
      .collect();

    const nonDeleted = allTransactions.filter((t) => !t.deletedAt);
    const reconciled = nonDeleted.filter(
      (t) => t.reconciliationStatus === "RECONCILED"
    ).length;
    const unreconciled = nonDeleted.filter(
      (t) => t.reconciliationStatus === "UNRECONCILED"
    ).length;
    const voided = nonDeleted.filter((t) => t.reconciliationStatus === "VOID")
      .length;

    return {
      ...account,
      linkedAccount,
      unreconciledCount: unreconciled,
      reconciliationSummary: {
        totalTransactions: nonDeleted.length,
        reconciled,
        unreconciled,
        voided,
      },
    };
  },
});

// Get bank statement (transaction list)
export const getStatement = query({
  args: {
    bankAccountId: v.id("bankAccounts"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    reconciliationStatus: v.optional(v.string()),
  },
  returns: v.object({
    bankAccount: v.any(),
    openingBalance: v.number(),
    transactions: v.array(v.any()),
    closingBalance: v.number(),
    totalDeposits: v.number(),
    totalWithdrawals: v.number(),
  }),
  handler: async (ctx, args) => {
    const bankAccount = await ctx.db.get(args.bankAccountId);
    if (!bankAccount || bankAccount.deletedAt) {
      throw new Error("Bank account not found");
    }

    // Get all transactions
    let transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bank_account", (q) =>
        q.eq("bankAccountId", args.bankAccountId)
      )
      .collect();

    // Filter deleted
    transactions = transactions.filter((t) => !t.deletedAt);

    // Filter by date range and status
    if (args.startDate || args.endDate || args.reconciliationStatus) {
      transactions = transactions.filter((t) => {
        if (args.startDate && t.transactionDate < args.startDate) return false;
        if (args.endDate && t.transactionDate > args.endDate) return false;
        if (
          args.reconciliationStatus &&
          t.reconciliationStatus !== args.reconciliationStatus
        )
          return false;
        return true;
      });
    }

    // Sort by date ascending
    transactions.sort((a, b) => a.transactionDate - b.transactionDate);

    // Calculate opening balance (initial + transactions before startDate)
    let openingBalance = bankAccount.initialBalance;
    if (args.startDate) {
      const priorTransactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bank_account", (q) =>
          q.eq("bankAccountId", args.bankAccountId)
        )
        .filter((q) =>
          q.and(
            q.lt(q.field("transactionDate"), args.startDate!),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .collect();

      for (const tx of priorTransactions) {
        if (
          tx.transactionType === "DEPOSIT" ||
          tx.transactionType === "TRANSFER_IN" ||
          tx.transactionType === "INTEREST"
        ) {
          openingBalance += tx.amount;
        } else {
          openingBalance -= tx.amount;
        }
      }
    }

    // Build transaction list with running balance
    let runningBalance = openingBalance;
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const enrichedTransactions = transactions.map((tx) => {
      let amount = tx.amount;
      if (
        tx.transactionType === "DEPOSIT" ||
        tx.transactionType === "TRANSFER_IN" ||
        tx.transactionType === "INTEREST"
      ) {
        runningBalance += amount;
        totalDeposits += amount;
      } else {
        runningBalance -= amount;
        totalWithdrawals += amount;
      }

      return {
        ...tx,
        balance: runningBalance,
      };
    });

    return {
      bankAccount,
      openingBalance,
      transactions: enrichedTransactions,
      closingBalance: runningBalance,
      totalDeposits,
      totalWithdrawals,
    };
  },
});

// Get balance at specific date
export const getBalanceAtDate = query({
  args: {
    bankAccountId: v.id("bankAccounts"),
    asOfDate: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const bankAccount = await ctx.db.get(args.bankAccountId);
    if (!bankAccount || bankAccount.deletedAt) {
      throw new Error("Bank account not found");
    }

    // Start with initial balance
    let balance = bankAccount.initialBalance;

    // Get all transactions up to asOfDate
    const transactions = await ctx.db
      .query("bankTransactions")
      .withIndex("by_bank_account", (q) =>
        q.eq("bankAccountId", args.bankAccountId)
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("transactionDate"), args.asOfDate),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Calculate balance
    for (const tx of transactions) {
      if (
        tx.transactionType === "DEPOSIT" ||
        tx.transactionType === "TRANSFER_IN" ||
        tx.transactionType === "INTEREST"
      ) {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }

    return balance;
  },
});

// Get bank account balance summary
export const getBalanceSummary = query({
  args: {},
  returns: v.object({
    totalBalance: v.number(),
    byBank: v.array(
      v.object({
        bankName: v.string(),
        accountCount: v.number(),
        totalBalance: v.number(),
      })
    ),
    byCurrency: v.array(
      v.object({
        currency: v.string(),
        totalBalance: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const accounts = await ctx.db.query("bankAccounts").collect();
    const activeAccounts = accounts.filter((a: any) => !a.deletedAt && a.isActive);

    const totalBalance = activeAccounts.reduce(
      (sum: number, a: any) => sum + a.currentBalance,
      0
    );

    // Group by bank
    const byBankMap = new Map<
      string,
      { accountCount: number; totalBalance: number }
    >();

    for (const account of activeAccounts) {
      const existing = byBankMap.get(account.bankName) || {
        accountCount: 0,
        totalBalance: 0,
      };
      byBankMap.set(account.bankName, {
        accountCount: existing.accountCount + 1,
        totalBalance: existing.totalBalance + account.currentBalance,
      });
    }

    const byBank = Array.from(byBankMap.entries()).map(([bankName, data]) => ({
      bankName,
      ...data,
    }));

    // Group by currency
    const byCurrencyMap = new Map<string, number>();

    for (const account of activeAccounts) {
      const existing = byCurrencyMap.get(account.currency) || 0;
      byCurrencyMap.set(account.currency, existing + account.currentBalance);
    }

    const byCurrency = Array.from(byCurrencyMap.entries()).map(
      ([currency, totalBalance]) => ({
        currency,
        totalBalance,
      })
    );

    return {
      totalBalance,
      byBank,
      byCurrency,
    };
  },
});
