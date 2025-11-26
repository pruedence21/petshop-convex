import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Get general ledger for an account
export const getAccountLedger = query({
  args: {
    accountId: v.id("accounts"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    account: v.any(),
    openingBalance: v.number(),
    transactions: v.array(v.any()),
    closingBalance: v.number(),
    totalDebit: v.number(),
    totalCredit: v.number(),
  }),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.deletedAt) {
      throw new Error("Account not found");
    }

    // Get all journal entry lines for this account
    let lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Filter by branch if specified
    if (args.branchId) {
      lines = lines.filter(
        (line) => !line.branchId || line.branchId === args.branchId
      );
    }

    // Get journal entries and filter by status and date
    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const je = await ctx.db.get(line.journalEntryId);
        if (!je || je.deletedAt || je.status !== "Posted") {
          return null;
        }

        // Filter by date range
        if (args.startDate && je.journalDate < args.startDate) {
          return { ...line, je, isOpening: true };
        }
        if (args.endDate && je.journalDate > args.endDate) {
          return null;
        }

        return { ...line, je, isOpening: false };
      })
    );

    const validLines = enrichedLines.filter((l) => l !== null) as any[];

    // Calculate opening balance (transactions before startDate)
    const openingLines = validLines.filter((l) => l.isOpening);
    let openingBalance = 0;
    for (const line of openingLines) {
      if (account.normalBalance === "DEBIT") {
        openingBalance += line.debitAmount - line.creditAmount;
      } else {
        openingBalance += line.creditAmount - line.debitAmount;
      }
    }

    // Get transactions in period
    const periodLines = validLines.filter((l) => !l.isOpening);

    // Sort by date
    periodLines.sort((a, b) => a.je.journalDate - b.je.journalDate);

    // Build transaction list with running balance
    let runningBalance = openingBalance;
    const transactions = periodLines.map((line) => {
      if (account.normalBalance === "DEBIT") {
        runningBalance += line.debitAmount - line.creditAmount;
      } else {
        runningBalance += line.creditAmount - line.debitAmount;
      }

      return {
        _id: line._id,
        journalEntryId: line.journalEntryId,
        journalNumber: line.je.journalNumber,
        journalDate: line.je.journalDate,
        description: line.description || line.je.description,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        balance: runningBalance,
      };
    });

    // Calculate totals
    const totalDebit = periodLines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = periodLines.reduce((sum, l) => sum + l.creditAmount, 0);
    const closingBalance = runningBalance;

    return {
      account,
      openingBalance,
      transactions,
      closingBalance,
      totalDebit,
      totalCredit,
    };
  },
});

// Get trial balance (all accounts with balances)
export const getTrialBalance = query({
  args: {
    asOfDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    asOfDate: v.number(),
    accounts: v.array(
      v.object({
        _id: v.id("accounts"),
        accountCode: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        category: v.string(),
        normalBalance: v.string(),
        debitBalance: v.number(),
        creditBalance: v.number(),
      })
    ),
    totalDebit: v.number(),
    totalCredit: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get all active accounts
    const allAccounts = await ctx.db.query("accounts").collect();
    const accounts = allAccounts.filter(
      (a) => !a.deletedAt && a.isActive && !a.isHeader
    );

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        // Get all posted journal entry lines for this account up to asOfDate
        let lines = await ctx.db
          .query("journalEntryLines")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();

        // Filter by branch if specified
        if (args.branchId) {
          lines = lines.filter(
            (line) => !line.branchId || line.branchId === args.branchId
          );
        }

        // Get journal entries and filter
        const validLines = await Promise.all(
          lines.map(async (line) => {
            const je = await ctx.db.get(line.journalEntryId);
            if (
              !je ||
              je.deletedAt ||
              je.status !== "Posted" ||
              je.journalDate > args.asOfDate
            ) {
              return null;
            }
            return line;
          })
        );

        const filteredLines = validLines.filter((l) => l !== null) as typeof lines;

        // Calculate balance
        let balance = 0;
        for (const line of filteredLines) {
          if (account.normalBalance === "DEBIT") {
            balance += line.debitAmount - line.creditAmount;
          } else {
            balance += line.creditAmount - line.debitAmount;
          }
        }

        // Return with debit/credit split
        return {
          _id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          category: account.category,
          normalBalance: account.normalBalance,
          debitBalance: balance > 0 && account.normalBalance === "DEBIT" ? balance : 0,
          creditBalance:
            balance > 0 && account.normalBalance === "CREDIT" ? balance : 0,
        };
      })
    );

    // Filter accounts with non-zero balance
    const nonZeroAccounts = accountBalances.filter(
      (a) => a.debitBalance !== 0 || a.creditBalance !== 0
    );

    // Sort by account code
    nonZeroAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    // Calculate totals
    const totalDebit = nonZeroAccounts.reduce((sum, a) => sum + a.debitBalance, 0);
    const totalCredit = nonZeroAccounts.reduce(
      (sum, a) => sum + a.creditBalance,
      0
    );

    return {
      asOfDate: args.asOfDate,
      accounts: nonZeroAccounts,
      totalDebit,
      totalCredit,
    };
  },
});

// Get account balances with hierarchy rollup
export const getAccountBalances = query({
  args: {
    accountType: v.optional(v.string()),
    asOfDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.array(
    v.object({
      _id: v.id("accounts"),
      accountCode: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      category: v.string(),
      normalBalance: v.string(),
      isHeader: v.boolean(),
      level: v.number(),
      balance: v.number(),
      children: v.optional(v.array(v.any())),
    })
  ),
  handler: async (ctx, args) => {
    // Get all accounts
    let allAccounts = await ctx.db.query("accounts").collect();

    // Filter by type if specified
    if (args.accountType) {
      allAccounts = allAccounts.filter(
        (a) => a.accountType === args.accountType
      );
    }

    const accounts = allAccounts.filter((a) => !a.deletedAt && a.isActive);

    // Calculate balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        if (account.isHeader) {
          // Header accounts: sum of children
          return {
            ...account,
            balance: 0, // Will be calculated later
          };
        }

        // Detail accounts: calculate from journal entries
        let lines = await ctx.db
          .query("journalEntryLines")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();

        // Filter by branch if specified
        if (args.branchId) {
          lines = lines.filter(
            (line) => !line.branchId || line.branchId === args.branchId
          );
        }

        // Get valid journal entries
        const validLines = await Promise.all(
          lines.map(async (line) => {
            const je = await ctx.db.get(line.journalEntryId);
            if (
              !je ||
              je.deletedAt ||
              je.status !== "Posted" ||
              je.journalDate > args.asOfDate
            ) {
              return null;
            }
            return line;
          })
        );

        const filteredLines = validLines.filter((l) => l !== null) as typeof lines;

        // Calculate balance
        let balance = 0;
        for (const line of filteredLines) {
          if (account.normalBalance === "DEBIT") {
            balance += line.debitAmount - line.creditAmount;
          } else {
            balance += line.creditAmount - line.debitAmount;
          }
        }

        return {
          ...account,
          balance,
        };
      })
    );

    // Build hierarchy and calculate header balances
    const calculateHeaderBalance = (
      accountId: Id<"accounts">,
      accounts: typeof accountsWithBalance
    ): number => {
      const children = accounts.filter((a) => a.parentAccountId === accountId);
      let total = 0;

      for (const child of children) {
        if (child.isHeader) {
          total += calculateHeaderBalance(child._id, accounts);
        } else {
          total += child.balance;
        }
      }

      return total;
    };

    // Update header balances
    const finalAccounts = accountsWithBalance.map((account) => {
      if (account.isHeader) {
        return {
          ...account,
          balance: calculateHeaderBalance(account._id, accountsWithBalance),
        };
      }
      return account;
    });

    // Build tree structure
    const buildTree = (parentId: Id<"accounts"> | undefined): any[] => {
      return finalAccounts
        .filter((a) => a.parentAccountId === parentId)
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
        .map((account) => ({
          ...account,
          children: account.isHeader ? buildTree(account._id) : undefined,
        }));
    };

    return buildTree(undefined);
  },
});

// Get journal entries by account
export const getJournalEntriesByAccount = query({
  args: {
    accountId: v.id("accounts"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account || account.deletedAt) {
      throw new Error("Account not found");
    }

    // Get all lines for this account
    const lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Get journal entries with date filtering
    const journalEntries = await Promise.all(
      lines.map(async (line) => {
        const je = await ctx.db.get(line.journalEntryId);
        if (!je || je.deletedAt || je.status !== "Posted") {
          return null;
        }

        // Filter by date
        if (args.startDate && je.journalDate < args.startDate) return null;
        if (args.endDate && je.journalDate > args.endDate) return null;

        return {
          ...je,
          line,
        };
      })
    );

    const validEntries = journalEntries.filter((e) => e !== null) as any[];

    // Sort by date descending
    validEntries.sort((a, b) => b.journalDate - a.journalDate);

    // Limit results
    const limited = args.limit
      ? validEntries.slice(0, args.limit)
      : validEntries;

    return limited;
  },
});




