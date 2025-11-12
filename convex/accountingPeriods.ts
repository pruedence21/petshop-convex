import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Accounting Period Management & Closing
 * 
 * Handles:
 * - Period creation and management
 * - Month-end closing process
 * - Year-end closing with P&L transfer to retained earnings
 * - Period locking to prevent backdating
 * - Balance snapshots for fast reporting
 */

// Create accounting period
export const createPeriod = mutation({
  args: {
    year: v.number(),
    month: v.number(), // 1-12
  },
  returns: v.id("accountingPeriods"),
  handler: async (ctx, args) => {
    // Validate month
    if (args.month < 1 || args.month > 12) {
      throw new Error("Month must be between 1 and 12");
    }

    // Check if period already exists
    const existing = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_year_month", (q: any) =>
        q.eq("year", args.year).eq("month", args.month)
      )
      .first();

    if (existing) {
      throw new Error(
        `Period ${args.year}-${String(args.month).padStart(2, "0")} already exists`
      );
    }

    // Calculate period dates
    const startDate = new Date(args.year, args.month - 1, 1).getTime();
    const endDate = new Date(args.year, args.month, 0, 23, 59, 59, 999).getTime();

    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const periodName = `${monthNames[args.month - 1]} ${args.year}`;

    const periodId = await ctx.db.insert("accountingPeriods", {
      year: args.year,
      month: args.month,
      periodName,
      startDate,
      endDate,
      status: "OPEN",
      createdBy: undefined, // TODO: auth integration
    });

    return periodId;
  },
});

// Close accounting period (month-end)
export const closePeriod = mutation({
  args: {
    periodId: v.id("accountingPeriods"),
  },
  returns: v.id("accountingPeriods"),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId) as any;
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status === "CLOSED") {
      throw new Error("Period already closed");
    }

    if (period.status === "LOCKED") {
      throw new Error("Period is locked. Cannot close.");
    }

    // Verify no draft journal entries in period
    const journalEntries = await ctx.db.query("journalEntries").collect();

    const draftEntries = journalEntries.filter(
      (je) =>
        !je.deletedAt &&
        je.status === "Draft" &&
        je.journalDate >= period.startDate &&
        je.journalDate <= period.endDate
    );

    if (draftEntries.length > 0) {
      throw new Error(
        `Cannot close period with ${draftEntries.length} draft journal entries. Post or delete them first.`
      );
    }

    // Create balance snapshots for all accounts
    await createBalanceSnapshots(ctx, args.periodId, period);

    // Update period status
    await ctx.db.patch(args.periodId, {
      status: "CLOSED",
      closedBy: undefined, // TODO: auth integration
      closedAt: Date.now(),
    });

    return args.periodId;
  },
});

// Helper: Create balance snapshots
async function createBalanceSnapshots(
  ctx: any,
  periodId: Id<"accountingPeriods">,
  period: any
) {
  // Get all active accounts
  const accounts = await ctx.db.query("accounts").collect();
  const activeAccounts = accounts.filter((a: any) => !a.deletedAt && a.isActive && !a.isHeader);

  // Get all branches for branch-level snapshots
  const branches = await ctx.db.query("branches").collect();
  const activeBranches = branches.filter((b: any) => !b.deletedAt && b.isActive);

  // Create snapshots for each account (consolidated)
  for (const account of activeAccounts) {
    // Get opening balance (closing balance of previous period)
    let openingBalance = 0;
    const previousPeriod = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_year_month", (q: any) =>
        q.eq("year", period.year).eq("month", period.month - 1)
      )
      .first();

    if (previousPeriod) {
      const previousSnapshot = await ctx.db
        .query("periodBalances")
        .withIndex("by_period_account", (q: any) =>
          q.eq("periodId", previousPeriod._id).eq("accountId", account._id)
        )
        .filter((q: any) => q.eq(q.field("branchId"), undefined))
        .first();

      if (previousSnapshot) {
        openingBalance = previousSnapshot.closingBalance;
      }
    }

    // Calculate period activity
    const lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_account", (q: any) => q.eq("accountId", account._id))
      .collect();

    const validLines = await Promise.all(
      lines.map(async (line: any) => {
        const je = await ctx.db.get(line.journalEntryId);
        if (
          !je ||
          je.deletedAt ||
          je.status !== "Posted" ||
          je.journalDate < period.startDate ||
          je.journalDate > period.endDate
        ) {
          return null;
        }
        return line;
      })
    );

    const filteredLines = validLines.filter((l: any) => l !== null) as typeof lines;

    const consolidatedLines = filteredLines.filter((l: any) => !l.branchId);

    const debitTotal = consolidatedLines.reduce((sum: any, l: any) => sum + l.debitAmount, 0);
    const creditTotal = consolidatedLines.reduce(
      (sum: any, l: any) => sum + l.creditAmount,
      0
    );

    // Calculate closing balance based on normal balance
    let closingBalance = openingBalance;
    if (account.normalBalance === "DEBIT") {
      closingBalance += debitTotal - creditTotal;
    } else {
      closingBalance += creditTotal - debitTotal;
    }

    // Create snapshot
    await ctx.db.insert("periodBalances", {
      periodId,
      accountId: account._id,
      branchId: undefined, // Consolidated
      openingBalance,
      debitTotal,
      creditTotal,
      closingBalance,
    });

    // Create branch-level snapshots
    for (const branch of activeBranches) {
      const branchLines = filteredLines.filter((l: any) => l.branchId === branch._id);

      const branchDebitTotal = branchLines.reduce(
        (sum: any, l: any) => sum + l.debitAmount,
        0
      );
      const branchCreditTotal = branchLines.reduce(
        (sum: any, l: any) => sum + l.creditAmount,
        0
      );

      // Get opening balance for branch
      let branchOpeningBalance = 0;
      if (previousPeriod) {
        const previousSnapshot = await ctx.db
          .query("periodBalances")
          .withIndex("by_period_account", (q: any) =>
            q.eq("periodId", previousPeriod._id).eq("accountId", account._id)
          )
          .filter((q: any) => q.eq(q.field("branchId"), branch._id))
          .first();

        if (previousSnapshot) {
          branchOpeningBalance = previousSnapshot.closingBalance;
        }
      }

      let branchClosingBalance = branchOpeningBalance;
      if (account.normalBalance === "DEBIT") {
        branchClosingBalance += branchDebitTotal - branchCreditTotal;
      } else {
        branchClosingBalance += branchCreditTotal - branchDebitTotal;
      }

      // Only create snapshot if there's activity or balance
      if (
        branchDebitTotal > 0 ||
        branchCreditTotal > 0 ||
        branchOpeningBalance !== 0
      ) {
        await ctx.db.insert("periodBalances", {
          periodId,
          accountId: account._id,
          branchId: branch._id,
          openingBalance: branchOpeningBalance,
          debitTotal: branchDebitTotal,
          creditTotal: branchCreditTotal,
          closingBalance: branchClosingBalance,
        });
      }
    }
  }
}

// Year-end closing (transfer P&L to retained earnings)
export const yearEndClose = mutation({
  args: {
    year: v.number(),
  },
  returns: v.object({
    journalEntryId: v.id("journalEntries"),
    netIncome: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get December period
    const decemberPeriod = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_year_month", (q) =>
        q.eq("year", args.year).eq("month", 12)
      )
      .first();

    if (!decemberPeriod) {
      throw new Error(`December ${args.year} period not found`);
    }

    if (decemberPeriod.status !== "CLOSED") {
      throw new Error(`December ${args.year} must be closed first`);
    }

    // Check if year-end closing already done
    const existingClosing = await ctx.db
      .query("journalEntries")
      .withIndex("by_journal_number")
      .filter((q) => q.eq(q.field("sourceType"), "YEAR_END_CLOSE"))
      .collect();

    const yearClosing = existingClosing.find(
      (je) =>
        !je.deletedAt &&
        je.description.includes(String(args.year)) &&
        je.status === "Posted"
    );

    if (yearClosing) {
      throw new Error(`Year-end closing for ${args.year} already completed`);
    }

    // Calculate net income for the year
    const startDate = new Date(args.year, 0, 1).getTime();
    const endDate = new Date(args.year, 11, 31, 23, 59, 59, 999).getTime();

    // Get all revenue and expense accounts
    const accounts = await ctx.db.query("accounts").collect();
    const revenueAccounts = accounts.filter(
      (a) => !a.deletedAt && a.isActive && a.accountType === "REVENUE" && !a.isHeader
    );
    const expenseAccounts = accounts.filter(
      (a) => !a.deletedAt && a.isActive && a.accountType === "EXPENSE" && !a.isHeader
    );

    // Calculate revenue total
    let totalRevenue = 0;
    for (const account of revenueAccounts) {
      const balance = await getAccountBalanceInPeriod(
        ctx,
        account._id,
        startDate,
        endDate
      );
      totalRevenue += balance; // Revenue has credit normal balance, so balance is positive
    }

    // Calculate expense total
    let totalExpense = 0;
    for (const account of expenseAccounts) {
      const balance = await getAccountBalanceInPeriod(
        ctx,
        account._id,
        startDate,
        endDate
      );
      totalExpense += balance; // Expense has debit normal balance, so balance is positive
    }

    const netIncome = totalRevenue - totalExpense;

    // Get retained earnings account (3-200)
    const retainedEarningsAccount = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", "3-200"))
      .first();

    if (!retainedEarningsAccount) {
      throw new Error("Retained earnings account (3-200) not found");
    }

    // Create year-end closing journal entry
    const journalNumber = `YEC-${args.year}`;

    const journalEntryId = await ctx.db.insert("journalEntries", {
      journalNumber,
      journalDate: endDate,
      description: `Year-end closing ${args.year} - Transfer net income to retained earnings`,
      sourceType: "YEAR_END_CLOSE",
      status: "Posted",
      totalDebit: Math.abs(netIncome),
      totalCredit: Math.abs(netIncome),
      postedBy: undefined,
      postedAt: Date.now(),
      createdBy: undefined,
    });

    if (netIncome > 0) {
      // Profit: DR Revenue accounts, CR Retained Earnings
      let sortOrder = 1;

      // Close revenue accounts
      for (const account of revenueAccounts) {
        const balance = await getAccountBalanceInPeriod(
          ctx,
          account._id,
          startDate,
          endDate
        );

        if (balance > 0) {
          await ctx.db.insert("journalEntryLines", {
            journalEntryId,
            accountId: account._id,
            description: `Close ${account.accountName} to retained earnings`,
            debitAmount: balance,
            creditAmount: 0,
            sortOrder: sortOrder++,
          });
        }
      }

      // Close expense accounts (reverse)
      for (const account of expenseAccounts) {
        const balance = await getAccountBalanceInPeriod(
          ctx,
          account._id,
          startDate,
          endDate
        );

        if (balance > 0) {
          await ctx.db.insert("journalEntryLines", {
            journalEntryId,
            accountId: account._id,
            description: `Close ${account.accountName} to retained earnings`,
            debitAmount: 0,
            creditAmount: balance,
            sortOrder: sortOrder++,
          });
        }
      }

      // Credit retained earnings
      await ctx.db.insert("journalEntryLines", {
        journalEntryId,
        accountId: retainedEarningsAccount._id,
        description: `Net income for ${args.year}`,
        debitAmount: 0,
        creditAmount: netIncome,
        sortOrder: sortOrder++,
      });
    } else if (netIncome < 0) {
      // Loss: DR Retained Earnings, CR Expense accounts
      let sortOrder = 1;

      // Debit retained earnings
      await ctx.db.insert("journalEntryLines", {
        journalEntryId,
        accountId: retainedEarningsAccount._id,
        description: `Net loss for ${args.year}`,
        debitAmount: Math.abs(netIncome),
        creditAmount: 0,
        sortOrder: sortOrder++,
      });

      // Close revenue accounts (reverse)
      for (const account of revenueAccounts) {
        const balance = await getAccountBalanceInPeriod(
          ctx,
          account._id,
          startDate,
          endDate
        );

        if (balance > 0) {
          await ctx.db.insert("journalEntryLines", {
            journalEntryId,
            accountId: account._id,
            description: `Close ${account.accountName} to retained earnings`,
            debitAmount: balance,
            creditAmount: 0,
            sortOrder: sortOrder++,
          });
        }
      }

      // Close expense accounts
      for (const account of expenseAccounts) {
        const balance = await getAccountBalanceInPeriod(
          ctx,
          account._id,
          startDate,
          endDate
        );

        if (balance > 0) {
          await ctx.db.insert("journalEntryLines", {
            journalEntryId,
            accountId: account._id,
            description: `Close ${account.accountName} to retained earnings`,
            debitAmount: 0,
            creditAmount: balance,
            sortOrder: sortOrder++,
          });
        }
      }
    }

    return {
      journalEntryId,
      netIncome,
    };
  },
});

// Helper: Get account balance in period
async function getAccountBalanceInPeriod(
  ctx: any,
  accountId: Id<"accounts">,
  startDate: number,
  endDate: number
): Promise<number> {
  const account = await ctx.db.get(accountId);
  if (!account) return 0;

  const lines = await ctx.db
    .query("journalEntryLines")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .collect();

  const validLines = await Promise.all(
    lines.map(async (line: any) => {
      const je = await ctx.db.get(line.journalEntryId);
      if (
        !je ||
        je.deletedAt ||
        je.status !== "Posted" ||
        je.journalDate < startDate ||
        je.journalDate > endDate
      ) {
        return null;
      }
      return line;
    })
  );

  const filteredLines = validLines.filter((l) => l !== null) as typeof lines;

  let balance = 0;
  for (const line of filteredLines) {
    if (account.normalBalance === "DEBIT") {
      balance += line.debitAmount - line.creditAmount;
    } else {
      balance += line.creditAmount - line.debitAmount;
    }
  }

  return balance;
}

// Lock period (prevent any changes)
export const lockPeriod = mutation({
  args: {
    periodId: v.id("accountingPeriods"),
  },
  returns: v.id("accountingPeriods"),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status !== "CLOSED") {
      throw new Error("Period must be closed before locking");
    }

    await ctx.db.patch(args.periodId, {
      status: "LOCKED",
    });

    return args.periodId;
  },
});

// Reopen period (unlock and reopen)
export const reopenPeriod = mutation({
  args: {
    periodId: v.id("accountingPeriods"),
  },
  returns: v.id("accountingPeriods"),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new Error("Period not found");
    }

    if (period.status === "OPEN") {
      throw new Error("Period is already open");
    }

    // Check if any future periods are closed
    const futurePeriods = await ctx.db
      .query("accountingPeriods")
      .collect()
      .then((periods) =>
        periods.filter(
          (p: any) =>
            (p.year > period.year ||
              (p.year === period.year && p.month > period.month)) &&
            (p.status === "CLOSED" || p.status === "LOCKED")
        )
      );

    if (futurePeriods.length > 0) {
      throw new Error(
        "Cannot reopen period while future periods are closed. Close periods must be reopened in reverse order."
      );
    }

    await ctx.db.patch(args.periodId, {
      status: "OPEN",
      closedBy: undefined,
      closedAt: undefined,
    });

    return args.periodId;
  },
});

// List periods
export const list = query({
  args: {
    year: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("accountingPeriods"),
      _creationTime: v.number(),
      year: v.number(),
      month: v.number(),
      periodName: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      status: v.string(),
      closedBy: v.optional(v.id("users")),
      closedAt: v.optional(v.number()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      transactionCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let periods = await ctx.db.query("accountingPeriods").collect();

    // Filter by year
    if (args.year) {
      periods = periods.filter((p) => p.year === args.year);
    }

    // Filter by status
    if (args.status) {
      periods = periods.filter((p) => p.status === args.status);
    }

    // No need to filter deleted (periods don't have soft delete)
    const filtered = periods;

    // Sort by year/month descending
    filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Enrich with transaction count
    const enriched = await Promise.all(
      filtered.map(async (period) => {
        const journalEntries = await ctx.db
          .query("journalEntries")
          .collect()
          .then((entries) =>
            entries.filter(
              (je) =>
                !je.deletedAt &&
                je.journalDate >= period.startDate &&
                je.journalDate <= period.endDate
            )
          );

        return {
          ...period,
          transactionCount: journalEntries.length,
        };
      })
    );

    return enriched;
  },
});

// Get period by ID
export const get = query({
  args: { id: v.id("accountingPeriods") },
  returns: v.union(
    v.object({
      _id: v.id("accountingPeriods"),
      _creationTime: v.number(),
      year: v.number(),
      month: v.number(),
      periodName: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      status: v.string(),
      closedBy: v.optional(v.id("users")),
      closedAt: v.optional(v.number()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      transactionCount: v.number(),
      balanceSnapshotCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const period = await ctx.db.get(args.id);
    if (!period) return null;

    const journalEntries = await ctx.db
      .query("journalEntries")
      .collect()
      .then((entries) =>
        entries.filter(
          (je) =>
            !je.deletedAt &&
            je.journalDate >= period.startDate &&
            je.journalDate <= period.endDate
        )
      );

    const balanceSnapshots = await ctx.db
      .query("periodBalances")
      .withIndex("by_period", (q) => q.eq("periodId", args.id))
      .collect();

    return {
      ...period,
      transactionCount: journalEntries.length,
      balanceSnapshotCount: balanceSnapshots.length,
    };
  },
});

// Get current open period
export const getCurrentPeriod = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("accountingPeriods"),
      _creationTime: v.number(),
      year: v.number(),
      month: v.number(),
      periodName: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      status: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const period = await ctx.db
      .query("accountingPeriods")
      .withIndex("by_year_month", (q) =>
        q.eq("year", currentYear).eq("month", currentMonth)
      )
      .first();

    if (!period) return null;

    return period;
  },
});
