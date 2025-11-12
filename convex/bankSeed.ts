import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed Bank Accounts
 * 
 * Create default bank accounts linked to Chart of Accounts
 */

export const seedBankAccounts = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    accountsCreated: v.number(),
  }),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("bankAccounts").first();
    if (existing) {
      return {
        success: false,
        message: "Bank accounts already seeded",
        accountsCreated: 0,
      };
    }

    // Get bank accounts from CoA
    const bankBCA = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", "1-111"))
      .first();

    const bankMandiri = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", "1-112"))
      .first();

    const bankBRI = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", "1-113"))
      .first();

    if (!bankBCA || !bankMandiri || !bankBRI) {
      throw new Error(
        "Bank accounts not found in Chart of Accounts. Run seedChartOfAccounts first."
      );
    }

    const bankAccounts = [
      {
        accountName: "Rekening Giro",
        bankName: "BCA",
        accountNumber: "1234567890",
        branchName: "KCP Jakarta Pusat",
        linkedAccountId: bankBCA._id,
        initialBalance: 50000000, // Rp 50 juta
        currentBalance: 50000000,
        currency: "IDR",
        notes: "Rekening operasional utama",
      },
      {
        accountName: "Rekening Tabungan",
        bankName: "Bank Mandiri",
        accountNumber: "9876543210",
        branchName: "Cabang Sudirman",
        linkedAccountId: bankMandiri._id,
        initialBalance: 25000000, // Rp 25 juta
        currentBalance: 25000000,
        currency: "IDR",
        notes: "Rekening cadangan",
      },
      {
        accountName: "Rekening Bisnis",
        bankName: "BRI",
        accountNumber: "1122334455",
        branchName: "Unit Thamrin",
        linkedAccountId: bankBRI._id,
        initialBalance: 15000000, // Rp 15 juta
        currentBalance: 15000000,
        currency: "IDR",
        notes: "Rekening untuk transaksi vendor",
      },
    ];

    let created = 0;
    for (const account of bankAccounts) {
      await ctx.db.insert("bankAccounts", {
        ...account,
        isActive: true,
        createdBy: undefined,
      });
      created++;
    }

    return {
      success: true,
      message: `Successfully seeded ${created} bank accounts`,
      accountsCreated: created,
    };
  },
});

// Seed sample bank transactions
export const seedBankTransactions = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    transactionsCreated: v.number(),
  }),
  handler: async (ctx) => {
    // Get bank accounts
    const bcaAccount = await ctx.db
      .query("bankAccounts")
      .filter((q) => q.eq(q.field("bankName"), "BCA"))
      .first();

    if (!bcaAccount) {
      throw new Error(
        "BCA bank account not found. Run seedBankAccounts first."
      );
    }

    // Sample transactions for testing
    const now = Date.now();
    const oneDay = 86400000;

    const transactions = [
      {
        transactionDate: now - 5 * oneDay,
        transactionType: "DEPOSIT",
        amount: 5000000,
        referenceNumber: "DEP001",
        description: "Setoran awal",
      },
      {
        transactionDate: now - 4 * oneDay,
        transactionType: "WITHDRAWAL",
        amount: 2000000,
        referenceNumber: "WD001",
        description: "Penarikan tunai untuk operasional",
      },
      {
        transactionDate: now - 3 * oneDay,
        transactionType: "TRANSFER_IN",
        amount: 3500000,
        referenceNumber: "TRF001",
        description: "Pembayaran dari customer",
      },
      {
        transactionDate: now - 2 * oneDay,
        transactionType: "FEE",
        amount: 6500,
        referenceNumber: "ADM001",
        description: "Biaya administrasi bulanan",
      },
      {
        transactionDate: now - 1 * oneDay,
        transactionType: "INTEREST",
        amount: 125000,
        referenceNumber: "INT001",
        description: "Bunga bank bulanan",
      },
    ];

    let created = 0;
    for (const tx of transactions) {
      await ctx.db.insert("bankTransactions", {
        bankAccountId: bcaAccount._id,
        transactionDate: tx.transactionDate,
        transactionType: tx.transactionType,
        amount: tx.amount,
        referenceNumber: tx.referenceNumber,
        description: tx.description,
        reconciliationStatus: "UNRECONCILED",
        createdBy: undefined,
      });
      created++;
    }

    return {
      success: true,
      message: `Successfully seeded ${created} bank transactions`,
      transactionsCreated: created,
    };
  },
});
