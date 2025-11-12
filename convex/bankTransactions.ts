import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateJournalNumber, getAccountByCode } from "./accountingHelpers";

// Record bank transaction (deposit, withdrawal, transfer)
export const recordTransaction = mutation({
  args: {
    bankAccountId: v.id("bankAccounts"),
    transactionDate: v.number(),
    transactionType: v.string(), // DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT, FEE, INTEREST
    amount: v.number(),
    referenceNumber: v.optional(v.string()),
    description: v.string(),
    bankStatementDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    autoCreateJournal: v.optional(v.boolean()), // Default true
  },
  returns: v.object({
    transactionId: v.id("bankTransactions"),
    journalEntryId: v.optional(v.id("journalEntries")),
  }),
  handler: async (ctx, args) => {
    const bankAccount = await ctx.db.get(args.bankAccountId);
    if (!bankAccount || bankAccount.deletedAt) {
      throw new Error("Bank account not found");
    }

    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Transaction amount must be positive");
    }

    // Create bank transaction
    const transactionId = await ctx.db.insert("bankTransactions", {
      bankAccountId: args.bankAccountId,
      transactionDate: args.transactionDate,
      transactionType: args.transactionType,
      amount: args.amount,
      referenceNumber: args.referenceNumber,
      description: args.description,
      bankStatementDate: args.bankStatementDate,
      reconciliationStatus: "UNRECONCILED",
      notes: args.notes,
      createdBy: undefined, // TODO: auth integration
    });

    // Update bank account balance
    let newBalance = bankAccount.currentBalance;
    if (
      args.transactionType === "DEPOSIT" ||
      args.transactionType === "TRANSFER_IN" ||
      args.transactionType === "INTEREST"
    ) {
      newBalance += args.amount;
    } else {
      newBalance -= args.amount;
    }

    await ctx.db.patch(args.bankAccountId, {
      currentBalance: newBalance,
      updatedBy: undefined,
    });

    // Auto-create journal entry if enabled (default true)
    let journalEntryId: Id<"journalEntries"> | undefined;
    if (args.autoCreateJournal !== false) {
      journalEntryId = await createBankTransactionJournal(ctx, {
        transactionId,
        bankAccountId: args.bankAccountId,
        linkedAccountId: bankAccount.linkedAccountId,
        transactionDate: args.transactionDate,
        transactionType: args.transactionType,
        amount: args.amount,
        description: args.description,
        referenceNumber: args.referenceNumber,
      });

      // Link journal entry to transaction
      await ctx.db.patch(transactionId, {
        journalEntryId,
      });
    }

    return { transactionId, journalEntryId };
  },
});

// Helper: Create journal entry for bank transaction
async function createBankTransactionJournal(
  ctx: any,
  args: {
    transactionId: Id<"bankTransactions">;
    bankAccountId: Id<"bankAccounts">;
    linkedAccountId: Id<"accounts">;
    transactionDate: number;
    transactionType: string;
    amount: number;
    description: string;
    referenceNumber?: string;
  }
): Promise<Id<"journalEntries">> {
  const journalNumber = await generateJournalNumber(ctx);

  const lines: Array<{
    accountId: Id<"accounts">;
    branchId?: Id<"branches">;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }> = [];

  // Determine contra account based on transaction type
  let contraAccountCode: string;
  let debitAccount: Id<"accounts">;
  let creditAccount: Id<"accounts">;

  if (args.transactionType === "DEPOSIT") {
    // DR Bank, CR Cash/Other Income
    debitAccount = args.linkedAccountId;
    contraAccountCode = "1-101"; // Default: Kas Besar (assume deposit from cash)
    creditAccount = await getAccountByCode(ctx, contraAccountCode);

    lines.push({
      accountId: debitAccount,
      description: `Setoran ke bank - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Setoran ke bank - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else if (args.transactionType === "WITHDRAWAL") {
    // DR Cash/Expense, CR Bank
    contraAccountCode = "1-101"; // Default: Kas Besar
    debitAccount = await getAccountByCode(ctx, contraAccountCode);
    creditAccount = args.linkedAccountId;

    lines.push({
      accountId: debitAccount,
      description: `Penarikan dari bank - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Penarikan dari bank - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else if (args.transactionType === "TRANSFER_IN") {
    // DR Bank, CR Other Bank/AR
    debitAccount = args.linkedAccountId;
    contraAccountCode = "1-120"; // Default: Piutang (assume payment received)
    creditAccount = await getAccountByCode(ctx, contraAccountCode);

    lines.push({
      accountId: debitAccount,
      description: `Transfer masuk - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Transfer masuk - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else if (args.transactionType === "TRANSFER_OUT") {
    // DR AP/Expense, CR Bank
    contraAccountCode = "2-101"; // Default: Hutang Usaha (assume payment to supplier)
    debitAccount = await getAccountByCode(ctx, contraAccountCode);
    creditAccount = args.linkedAccountId;

    lines.push({
      accountId: debitAccount,
      description: `Transfer keluar - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Transfer keluar - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else if (args.transactionType === "FEE") {
    // DR Bank Fee Expense, CR Bank
    contraAccountCode = "5-211"; // Beban Administrasi Bank
    debitAccount = await getAccountByCode(ctx, contraAccountCode);
    creditAccount = args.linkedAccountId;

    lines.push({
      accountId: debitAccount,
      description: `Biaya administrasi bank - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Biaya administrasi bank - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else if (args.transactionType === "INTEREST") {
    // DR Bank, CR Interest Income
    debitAccount = args.linkedAccountId;
    contraAccountCode = "4-201"; // Pendapatan Bunga
    creditAccount = await getAccountByCode(ctx, contraAccountCode);

    lines.push({
      accountId: debitAccount,
      description: `Bunga bank - ${args.description}`,
      debitAmount: args.amount,
      creditAmount: 0,
    });

    lines.push({
      accountId: creditAccount,
      description: `Bunga bank - ${args.description}`,
      debitAmount: 0,
      creditAmount: args.amount,
    });
  } else {
    throw new Error(`Unknown transaction type: ${args.transactionType}`);
  }

  // Create journal entry
  const journalEntryId = await ctx.db.insert("journalEntries", {
    journalNumber,
    journalDate: args.transactionDate,
    description: `Transaksi bank ${args.referenceNumber ? `(${args.referenceNumber})` : ""} - ${args.description}`,
    sourceType: "BANK",
    sourceId: args.transactionId,
    status: "Posted", // Auto-post bank transactions
    totalDebit: args.amount,
    totalCredit: args.amount,
    postedBy: undefined,
    postedAt: Date.now(),
    createdBy: undefined,
  });

  // Create journal entry lines
  let sortOrder = 1;
  for (const line of lines) {
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: line.accountId,
      branchId: line.branchId,
      description: line.description,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      sortOrder: sortOrder++,
    });
  }

  return journalEntryId;
}

// Reconcile bank transaction
export const reconcile = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
    bankStatementDate: v.optional(v.number()),
  },
  returns: v.id("bankTransactions"),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.deletedAt) {
      throw new Error("Bank transaction not found");
    }

    if (transaction.reconciliationStatus === "RECONCILED") {
      throw new Error("Transaction already reconciled");
    }

    await ctx.db.patch(args.transactionId, {
      reconciliationStatus: "RECONCILED",
      reconciledDate: Date.now(),
      reconciledBy: undefined, // TODO: auth integration
      bankStatementDate: args.bankStatementDate || transaction.bankStatementDate,
      updatedBy: undefined,
    });

    return args.transactionId;
  },
});

// Unreconcile bank transaction
export const unreconcile = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
  },
  returns: v.id("bankTransactions"),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.deletedAt) {
      throw new Error("Bank transaction not found");
    }

    if (transaction.reconciliationStatus !== "RECONCILED") {
      throw new Error("Transaction is not reconciled");
    }

    await ctx.db.patch(args.transactionId, {
      reconciliationStatus: "UNRECONCILED",
      reconciledDate: undefined,
      reconciledBy: undefined,
      updatedBy: undefined,
    });

    return args.transactionId;
  },
});

// Void bank transaction
export const voidTransaction = mutation({
  args: {
    transactionId: v.id("bankTransactions"),
  },
  returns: v.id("bankTransactions"),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.deletedAt) {
      throw new Error("Bank transaction not found");
    }

    const bankAccount = await ctx.db.get(transaction.bankAccountId);
    if (!bankAccount) {
      throw new Error("Bank account not found");
    }

    // Reverse balance update
    let newBalance = bankAccount.currentBalance;
    if (
      transaction.transactionType === "DEPOSIT" ||
      transaction.transactionType === "TRANSFER_IN" ||
      transaction.transactionType === "INTEREST"
    ) {
      newBalance -= transaction.amount;
    } else {
      newBalance += transaction.amount;
    }

    await ctx.db.patch(transaction.bankAccountId, {
      currentBalance: newBalance,
      updatedBy: undefined,
    });

    // Void journal entry if exists
    if (transaction.journalEntryId) {
      const je = await ctx.db.get(transaction.journalEntryId);
      if (je && je.status === "Posted") {
        await ctx.db.patch(transaction.journalEntryId, {
          status: "Voided",
          voidedBy: undefined,
          voidedAt: Date.now(),
          voidReason: "Bank transaction voided",
          updatedBy: undefined,
        });
      }
    }

    // Mark transaction as void
    await ctx.db.patch(args.transactionId, {
      reconciliationStatus: "VOID",
      updatedBy: undefined,
    });

    return args.transactionId;
  },
});

// List bank transactions
export const list = query({
  args: {
    bankAccountId: v.optional(v.id("bankAccounts")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    reconciliationStatus: v.optional(v.string()),
    transactionType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("bankTransactions"),
      _creationTime: v.number(),
      bankAccountId: v.id("bankAccounts"),
      transactionDate: v.number(),
      transactionType: v.string(),
      amount: v.number(),
      referenceNumber: v.optional(v.string()),
      description: v.string(),
      journalEntryId: v.optional(v.id("journalEntries")),
      reconciliationStatus: v.string(),
      reconciledDate: v.optional(v.number()),
      reconciledBy: v.optional(v.id("users")),
      bankStatementDate: v.optional(v.number()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      bankAccount: v.any(),
    })
  ),
  handler: async (ctx, args) => {
    let transactions;

    if (args.bankAccountId) {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_bank_account", (q) =>
          q.eq("bankAccountId", args.bankAccountId!)
        )
        .order("desc")
        .collect();
    } else if (args.reconciliationStatus) {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_reconciliation_status", (q) =>
          q.eq("reconciliationStatus", args.reconciliationStatus!)
        )
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db
        .query("bankTransactions")
        .withIndex("by_transaction_date")
        .order("desc")
        .collect();
    }

    // Filter deleted
    transactions = transactions.filter((t) => !t.deletedAt);

    // Filter by date range and type
    if (args.startDate || args.endDate || args.transactionType) {
      transactions = transactions.filter((t) => {
        if (args.startDate && t.transactionDate < args.startDate) return false;
        if (args.endDate && t.transactionDate > args.endDate) return false;
        if (args.transactionType && t.transactionType !== args.transactionType)
          return false;
        return true;
      });
    }

    // Limit results
    const limited = args.limit ? transactions.slice(0, args.limit) : transactions;

    // Enrich with bank account
    const enriched = await Promise.all(
      limited.map(async (tx) => {
        const bankAccount = await ctx.db.get(tx.bankAccountId);
        return {
          ...tx,
          bankAccount,
        };
      })
    );

    return enriched;
  },
});

// Get transaction by ID
export const get = query({
  args: { id: v.id("bankTransactions") },
  returns: v.union(
    v.object({
      _id: v.id("bankTransactions"),
      _creationTime: v.number(),
      bankAccountId: v.id("bankAccounts"),
      transactionDate: v.number(),
      transactionType: v.string(),
      amount: v.number(),
      referenceNumber: v.optional(v.string()),
      description: v.string(),
      journalEntryId: v.optional(v.id("journalEntries")),
      reconciliationStatus: v.string(),
      reconciledDate: v.optional(v.number()),
      reconciledBy: v.optional(v.id("users")),
      bankStatementDate: v.optional(v.number()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      bankAccount: v.any(),
      journalEntry: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.id);
    if (!transaction || transaction.deletedAt) return null;

    const bankAccount = await ctx.db.get(transaction.bankAccountId);

    let journalEntry = null;
    if (transaction.journalEntryId) {
      journalEntry = await ctx.db.get(transaction.journalEntryId);
    }

    return {
      ...transaction,
      bankAccount,
      journalEntry,
    };
  },
});

// Bulk reconcile transactions
export const bulkReconcile = mutation({
  args: {
    transactionIds: v.array(v.id("bankTransactions")),
    bankStatementDate: v.number(),
  },
  returns: v.object({
    successCount: v.number(),
    failedIds: v.array(v.id("bankTransactions")),
  }),
  handler: async (ctx, args) => {
    let successCount = 0;
    const failedIds: Id<"bankTransactions">[] = [];

    for (const transactionId of args.transactionIds) {
      try {
        const transaction = await ctx.db.get(transactionId);
        if (
          !transaction ||
          transaction.deletedAt ||
          transaction.reconciliationStatus === "RECONCILED"
        ) {
          failedIds.push(transactionId);
          continue;
        }

        await ctx.db.patch(transactionId, {
          reconciliationStatus: "RECONCILED",
          reconciledDate: Date.now(),
          reconciledBy: undefined,
          bankStatementDate: args.bankStatementDate,
          updatedBy: undefined,
        });

        successCount++;
      } catch (error) {
        failedIds.push(transactionId);
      }
    }

    return { successCount, failedIds };
  },
});
