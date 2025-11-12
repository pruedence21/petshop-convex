import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Financial Reports
 * 
 * Generate Balance Sheet, Income Statement (P&L), and Cash Flow Statement
 */

// Balance Sheet (Statement of Financial Position)
export const getBalanceSheet = query({
  args: {
    asOfDate: v.number(),
    branchId: v.optional(v.id("branches")),
    comparative: v.optional(v.boolean()), // Show prior period comparison
    priorDate: v.optional(v.number()),
  },
  returns: v.object({
    asOfDate: v.number(),
    priorDate: v.optional(v.number()),
    assets: v.object({
      currentAssets: v.array(v.any()),
      fixedAssets: v.array(v.any()),
      totalCurrentAssets: v.number(),
      totalFixedAssets: v.number(),
      totalAssets: v.number(),
    }),
    liabilities: v.object({
      currentLiabilities: v.array(v.any()),
      longTermLiabilities: v.array(v.any()),
      totalCurrentLiabilities: v.number(),
      totalLongTermLiabilities: v.number(),
      totalLiabilities: v.number(),
    }),
    equity: v.object({
      items: v.array(v.any()),
      totalEquity: v.number(),
    }),
    totalLiabilitiesAndEquity: v.number(),
  }),
  handler: async (ctx, args) => {
    // Helper: Get account balance
    const getAccountBalance = async (
      accountId: string,
      asOfDate: number
    ): Promise<number> => {
      const account = await ctx.db.get(accountId as any) as any;
      if (!account || !account.normalBalance) return 0;

      let lines = await ctx.db
        .query("journalEntryLines")
        .withIndex("by_account", (q) => q.eq("accountId", accountId as any))
        .collect();

      // Filter by branch if specified
      if (args.branchId) {
        lines = lines.filter(
          (line) => !line.branchId || line.branchId === args.branchId
        );
      }

      // Get valid journal entries up to asOfDate
      const validLines = await Promise.all(
        lines.map(async (line) => {
          const je = await ctx.db.get(line.journalEntryId);
          if (
            !je ||
            je.deletedAt ||
            je.status !== "Posted" ||
            je.journalDate > asOfDate
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
    };

    // Get all accounts by type
    const allAccounts = await ctx.db.query("accounts").collect();
    const activeAccounts = allAccounts.filter((a) => !a.deletedAt && a.isActive);

    // ASSETS
    const assetAccounts = activeAccounts.filter(
      (a) => a.accountType === "ASSET" && !a.isHeader
    );

    const currentAssetAccounts = assetAccounts.filter(
      (a) =>
        a.category.includes("Current") ||
        a.category.includes("Cash") ||
        a.category.includes("Bank") ||
        a.category.includes("Receivable") ||
        a.category.includes("Inventory") ||
        a.category.includes("Prepaid")
    );

    const fixedAssetAccounts = assetAccounts.filter(
      (a) =>
        a.category.includes("Fixed") ||
        a.category.includes("Equipment") ||
        a.category.includes("Furniture") ||
        a.category.includes("Vehicle") ||
        a.category.includes("Building") ||
        a.category.includes("Depreciation")
    );

    const currentAssets = await Promise.all(
      currentAssetAccounts.map(async (account) => {
        const currentBalance = await getAccountBalance(
          account._id,
          args.asOfDate
        );
        let priorBalance = undefined;
        if (args.comparative && args.priorDate) {
          priorBalance = await getAccountBalance(account._id, args.priorDate);
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: currentBalance,
          priorBalance,
        };
      })
    );

    const fixedAssets = await Promise.all(
      fixedAssetAccounts.map(async (account) => {
        const currentBalance = await getAccountBalance(
          account._id,
          args.asOfDate
        );
        let priorBalance = undefined;
        if (args.comparative && args.priorDate) {
          priorBalance = await getAccountBalance(account._id, args.priorDate);
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: currentBalance,
          priorBalance,
        };
      })
    );

    const totalCurrentAssets = currentAssets.reduce(
      (sum, a) => sum + a.balance,
      0
    );
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.balance, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // LIABILITIES
    const liabilityAccounts = activeAccounts.filter(
      (a) => a.accountType === "LIABILITY" && !a.isHeader
    );

    const currentLiabilityAccounts = liabilityAccounts.filter(
      (a) => a.category.includes("Current") || a.category.includes("Payable")
    );

    const longTermLiabilityAccounts = liabilityAccounts.filter(
      (a) => a.category.includes("Long-term") || a.category.includes("Loan")
    );

    const currentLiabilities = await Promise.all(
      currentLiabilityAccounts.map(async (account) => {
        const currentBalance = await getAccountBalance(
          account._id,
          args.asOfDate
        );
        let priorBalance = undefined;
        if (args.comparative && args.priorDate) {
          priorBalance = await getAccountBalance(account._id, args.priorDate);
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: currentBalance,
          priorBalance,
        };
      })
    );

    const longTermLiabilities = await Promise.all(
      longTermLiabilityAccounts.map(async (account) => {
        const currentBalance = await getAccountBalance(
          account._id,
          args.asOfDate
        );
        let priorBalance = undefined;
        if (args.comparative && args.priorDate) {
          priorBalance = await getAccountBalance(account._id, args.priorDate);
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: currentBalance,
          priorBalance,
        };
      })
    );

    const totalCurrentLiabilities = currentLiabilities.reduce(
      (sum, a) => sum + a.balance,
      0
    );
    const totalLongTermLiabilities = longTermLiabilities.reduce(
      (sum, a) => sum + a.balance,
      0
    );
    const totalLiabilities =
      totalCurrentLiabilities + totalLongTermLiabilities;

    // EQUITY
    const equityAccounts = activeAccounts.filter(
      (a) => a.accountType === "EQUITY" && !a.isHeader
    );

    const equityItems = await Promise.all(
      equityAccounts.map(async (account) => {
        const currentBalance = await getAccountBalance(
          account._id,
          args.asOfDate
        );
        let priorBalance = undefined;
        if (args.comparative && args.priorDate) {
          priorBalance = await getAccountBalance(account._id, args.priorDate);
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          balance: currentBalance,
          priorBalance,
        };
      })
    );

    const totalEquity = equityItems.reduce((sum, a) => sum + a.balance, 0);

    return {
      asOfDate: args.asOfDate,
      priorDate: args.priorDate,
      assets: {
        currentAssets: currentAssets.filter((a) => a.balance !== 0),
        fixedAssets: fixedAssets.filter((a) => a.balance !== 0),
        totalCurrentAssets,
        totalFixedAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities: currentLiabilities.filter((a) => a.balance !== 0),
        longTermLiabilities: longTermLiabilities.filter((a) => a.balance !== 0),
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalLiabilities,
      },
      equity: {
        items: equityItems.filter((a) => a.balance !== 0),
        totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  },
});

// Income Statement (Profit & Loss)
export const getIncomeStatement = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
    comparative: v.optional(v.boolean()),
    priorStartDate: v.optional(v.number()),
    priorEndDate: v.optional(v.number()),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    revenue: v.object({
      operatingRevenue: v.array(v.any()),
      otherIncome: v.array(v.any()),
      totalOperatingRevenue: v.number(),
      totalOtherIncome: v.number(),
      totalRevenue: v.number(),
    }),
    cogs: v.object({
      items: v.array(v.any()),
      totalCogs: v.number(),
    }),
    grossProfit: v.number(),
    grossProfitMargin: v.number(),
    expenses: v.object({
      operating: v.array(v.any()),
      tax: v.array(v.any()),
      totalOperating: v.number(),
      totalTax: v.number(),
      totalExpenses: v.number(),
    }),
    netIncome: v.number(),
    netProfitMargin: v.number(),
  }),
  handler: async (ctx, args) => {
    // Helper: Get account activity in period
    const getAccountActivity = async (
      accountId: string,
      startDate: number,
      endDate: number
    ): Promise<number> => {
      const account = await ctx.db.get(accountId as any) as any;
      if (!account || !account.normalBalance) return 0;

      let lines = await ctx.db
        .query("journalEntryLines")
        .withIndex("by_account", (q) => q.eq("accountId", accountId as any))
        .collect();

      // Filter by branch if specified
      if (args.branchId) {
        lines = lines.filter(
          (line) => !line.branchId || line.branchId === args.branchId
        );
      }

      // Get valid journal entries in period
      const validLines = await Promise.all(
        lines.map(async (line) => {
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

      let activity = 0;
      for (const line of filteredLines) {
        if (account.normalBalance === "DEBIT") {
          activity += line.debitAmount - line.creditAmount;
        } else {
          activity += line.creditAmount - line.debitAmount;
        }
      }

      return activity;
    };

    // Get all accounts
    const allAccounts = await ctx.db.query("accounts").collect();
    const activeAccounts = allAccounts.filter((a) => !a.deletedAt && a.isActive);

    // REVENUE
    const revenueAccounts = activeAccounts.filter(
      (a) => a.accountType === "REVENUE" && !a.isHeader
    );

    const operatingRevenueAccounts = revenueAccounts.filter((a) =>
      a.category.includes("Operating")
    );

    const otherIncomeAccounts = revenueAccounts.filter(
      (a) =>
        a.category.includes("Other") ||
        a.category.includes("Interest") ||
        a.category.includes("Discount")
    );

    const operatingRevenue = await Promise.all(
      operatingRevenueAccounts.map(async (account) => {
        const currentActivity = await getAccountActivity(
          account._id,
          args.startDate,
          args.endDate
        );
        let priorActivity = undefined;
        if (args.comparative && args.priorStartDate && args.priorEndDate) {
          priorActivity = await getAccountActivity(
            account._id,
            args.priorStartDate,
            args.priorEndDate
          );
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: currentActivity,
          priorAmount: priorActivity,
        };
      })
    );

    const otherIncome = await Promise.all(
      otherIncomeAccounts.map(async (account) => {
        const currentActivity = await getAccountActivity(
          account._id,
          args.startDate,
          args.endDate
        );
        let priorActivity = undefined;
        if (args.comparative && args.priorStartDate && args.priorEndDate) {
          priorActivity = await getAccountActivity(
            account._id,
            args.priorStartDate,
            args.priorEndDate
          );
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: currentActivity,
          priorAmount: priorActivity,
        };
      })
    );

    const totalOperatingRevenue = operatingRevenue.reduce(
      (sum, a) => sum + a.amount,
      0
    );
    const totalOtherIncome = otherIncome.reduce((sum, a) => sum + a.amount, 0);
    const totalRevenue = totalOperatingRevenue + totalOtherIncome;

    // COGS
    const cogsAccounts = activeAccounts.filter(
      (a) =>
        a.accountType === "EXPENSE" &&
        !a.isHeader &&
        a.category.includes("COGS")
    );

    const cogsItems = await Promise.all(
      cogsAccounts.map(async (account) => {
        const currentActivity = await getAccountActivity(
          account._id,
          args.startDate,
          args.endDate
        );
        let priorActivity = undefined;
        if (args.comparative && args.priorStartDate && args.priorEndDate) {
          priorActivity = await getAccountActivity(
            account._id,
            args.priorStartDate,
            args.priorEndDate
          );
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: currentActivity,
          priorAmount: priorActivity,
        };
      })
    );

    const totalCogs = cogsItems.reduce((sum, a) => sum + a.amount, 0);

    // Gross Profit
    const grossProfit = totalRevenue - totalCogs;
    const grossProfitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // EXPENSES
    const expenseAccounts = activeAccounts.filter(
      (a) =>
        a.accountType === "EXPENSE" &&
        !a.isHeader &&
        !a.category.includes("COGS")
    );

    const operatingExpenseAccounts = expenseAccounts.filter(
      (a) => !a.category.includes("Tax")
    );

    const taxExpenseAccounts = expenseAccounts.filter((a) =>
      a.category.includes("Tax")
    );

    const operatingExpenses = await Promise.all(
      operatingExpenseAccounts.map(async (account) => {
        const currentActivity = await getAccountActivity(
          account._id,
          args.startDate,
          args.endDate
        );
        let priorActivity = undefined;
        if (args.comparative && args.priorStartDate && args.priorEndDate) {
          priorActivity = await getAccountActivity(
            account._id,
            args.priorStartDate,
            args.priorEndDate
          );
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: currentActivity,
          priorAmount: priorActivity,
        };
      })
    );

    const taxExpenses = await Promise.all(
      taxExpenseAccounts.map(async (account) => {
        const currentActivity = await getAccountActivity(
          account._id,
          args.startDate,
          args.endDate
        );
        let priorActivity = undefined;
        if (args.comparative && args.priorStartDate && args.priorEndDate) {
          priorActivity = await getAccountActivity(
            account._id,
            args.priorStartDate,
            args.priorEndDate
          );
        }

        return {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: currentActivity,
          priorAmount: priorActivity,
        };
      })
    );

    const totalOperatingExpenses = operatingExpenses.reduce(
      (sum, a) => sum + a.amount,
      0
    );
    const totalTaxExpenses = taxExpenses.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = totalOperatingExpenses + totalTaxExpenses;

    // Net Income
    const netIncome = grossProfit - totalExpenses;
    const netProfitMargin =
      totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      revenue: {
        operatingRevenue: operatingRevenue.filter((a) => a.amount !== 0),
        otherIncome: otherIncome.filter((a) => a.amount !== 0),
        totalOperatingRevenue,
        totalOtherIncome,
        totalRevenue,
      },
      cogs: {
        items: cogsItems.filter((a) => a.amount !== 0),
        totalCogs,
      },
      grossProfit,
      grossProfitMargin,
      expenses: {
        operating: operatingExpenses.filter((a) => a.amount !== 0),
        tax: taxExpenses.filter((a) => a.amount !== 0),
        totalOperating: totalOperatingExpenses,
        totalTax: totalTaxExpenses,
        totalExpenses,
      },
      netIncome,
      netProfitMargin,
    };
  },
});

// Cash Flow Statement (Indirect Method)
export const getCashFlowStatement = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    branchId: v.optional(v.id("branches")),
  },
  returns: v.object({
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
    }),
    operatingActivities: v.object({
      netIncome: v.number(),
      adjustments: v.array(v.any()),
      totalAdjustments: v.number(),
      netCashFromOperating: v.number(),
    }),
    investingActivities: v.object({
      items: v.array(v.any()),
      netCashFromInvesting: v.number(),
    }),
    financingActivities: v.object({
      items: v.array(v.any()),
      netCashFromFinancing: v.number(),
    }),
    netCashChange: v.number(),
    cashBeginning: v.number(),
    cashEnding: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get Net Income from Income Statement
    // Note: For now, we'll calculate net income directly
    // TODO: Properly call getIncomeStatement query
    const netIncome = 0; // Placeholder
    
    /*
    const incomeStatement = await ctx.runQuery(
      api.financialReports.getIncomeStatement as any,
      {
        startDate: args.startDate,
        endDate: args.endDate,
        branchId: args.branchId,
      }
    );

    const netIncome = incomeStatement.netIncome;
    */

    // Operating Activities: Adjustments for non-cash items
    // (Depreciation, changes in AR, AP, inventory, etc.)
    
    // For now, simplified version - just show net income
    // TODO: Add proper adjustments calculation

    const adjustments: any[] = [];
    const totalAdjustments = 0;
    const netCashFromOperating = netIncome + totalAdjustments;

    // Investing Activities
    // (Purchase/sale of fixed assets, equipment, etc.)
    const investingItems: any[] = [];
    const netCashFromInvesting = 0;

    // Financing Activities
    // (Loans, equity, dividends, etc.)
    const financingItems: any[] = [];
    const netCashFromFinancing = 0;

    // Net Cash Change
    const netCashChange =
      netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

    // Calculate beginning and ending cash balances
    // Cash = Kas Besar + Kas Kecil + Bank accounts
    const cashAccountCodes = ["1-101", "1-102", "1-111", "1-112", "1-113"];
    
    let cashBeginning = 0;
    let cashEnding = 0;

    for (const code of cashAccountCodes) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_account_code", (q) => q.eq("accountCode", code))
        .first();

      if (account) {
        // Get balance at period start (1 day before startDate)
        const beginningBalance = await getAccountBalanceAtDate(
          ctx,
          account._id,
          args.startDate - 86400000,
          args.branchId
        );
        cashBeginning += beginningBalance;

        // Get balance at period end
        const endingBalance = await getAccountBalanceAtDate(
          ctx,
          account._id,
          args.endDate,
          args.branchId
        );
        cashEnding += endingBalance;
      }
    }

    return {
      period: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      operatingActivities: {
        netIncome,
        adjustments,
        totalAdjustments,
        netCashFromOperating,
      },
      investingActivities: {
        items: investingItems,
        netCashFromInvesting,
      },
      financingActivities: {
        items: financingItems,
        netCashFromFinancing,
      },
      netCashChange,
      cashBeginning,
      cashEnding,
    };
  },
});

// Helper function for Cash Flow
async function getAccountBalanceAtDate(
  ctx: any,
  accountId: any,
  asOfDate: number,
  branchId?: any
): Promise<number> {
  const account = await ctx.db.get(accountId) as any;
  if (!account || !account.normalBalance) return 0;

  let lines = await ctx.db
    .query("journalEntryLines")
    .withIndex("by_account", (q: any) => q.eq("accountId", accountId))
    .collect();

  if (branchId) {
    lines = lines.filter(
      (line: any) => !line.branchId || line.branchId === branchId
    );
  }

  const validLines = await Promise.all(
    lines.map(async (line: any) => {
      const je = await ctx.db.get(line.journalEntryId);
      if (
        !je ||
        je.deletedAt ||
        je.status !== "Posted" ||
        je.journalDate > asOfDate
      ) {
        return null;
      }
      return line;
    })
  );

  const filteredLines = validLines.filter((l) => l !== null);

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
