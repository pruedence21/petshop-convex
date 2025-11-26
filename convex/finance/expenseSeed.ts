import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Expense Category Seeding Functions
 * Updated to match CoA codes
 */

export const seedExpenseCategories = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    categoriesCreated: v.number(),
  }),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("expenseCategories").first();
    if (existing) {
      return {
        success: false,
        message: "Expense categories already seeded",
        categoriesCreated: 0,
      };
    }

    // Get expense accounts from CoA
    const getAccount = async (code: string) => {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_account_code", (q) => q.eq("accountCode", code))
        .first();
      if (!account) {
        throw new Error(`Account ${code} not found. Run seedChartOfAccounts first.`);
      }
      return account;
    };

    const categories = [
      {
        categoryName: "Gaji & Upah",
        accountCode: "5-201",
        requiresApproval: true,
        approvalThreshold: 5000000, // Rp 5 juta
        description: "Gaji karyawan, upah harian, tunjangan",
      },
      {
        categoryName: "Sewa",
        accountCode: "5-202",
        requiresApproval: true,
        approvalThreshold: 10000000, // Rp 10 juta
        description: "Sewa gedung, kantor, warehouse",
      },
      {
        categoryName: "Listrik, Air & Gas",
        accountCode: "5-203",
        requiresApproval: false,
        description: "Utilitas bulanan",
      },
      {
        categoryName: "Telepon & Internet",
        accountCode: "5-204",
        requiresApproval: false,
        description: "Komunikasi dan internet",
      },
      {
        categoryName: "Perlengkapan Kantor",
        accountCode: "5-205",
        requiresApproval: false,
        description: "ATK, printer, toner, dll",
      },
      {
        categoryName: "Pemasaran & Promosi",
        accountCode: "5-208",
        requiresApproval: true,
        approvalThreshold: 3000000, // Rp 3 juta
        description: "Iklan, brosur, social media ads",
      },
      {
        categoryName: "Transportasi & BBM",
        accountCode: "5-207",
        requiresApproval: false,
        description: "Bensin, tol, parkir, ojek online",
      },
      {
        categoryName: "Perbaikan & Pemeliharaan",
        accountCode: "5-206",
        requiresApproval: true,
        approvalThreshold: 2000000, // Rp 2 juta
        description: "Maintenance peralatan, gedung, kendaraan",
      },
      {
        categoryName: "Asuransi",
        accountCode: "5-209",
        requiresApproval: true,
        approvalThreshold: 5000000,
        description: "Premi asuransi karyawan, aset",
      },
      {
        categoryName: "Biaya Profesional",
        accountCode: "5-212", // Mapped to Beban Lain-lain as specific account doesn't exist
        requiresApproval: true,
        approvalThreshold: 5000000,
        description: "Konsultan, akuntan, lawyer",
      },
      {
        categoryName: "Biaya Administrasi Bank",
        accountCode: "5-211",
        requiresApproval: false,
        description: "Admin bank, transfer fee, biaya kartu kredit",
      },
      {
        categoryName: "Lain-lain",
        accountCode: "5-212",
        requiresApproval: true,
        approvalThreshold: 1000000, // Rp 1 juta
        description: "Pengeluaran operasional lainnya",
      },
    ];

    let created = 0;
    for (const cat of categories) {
      const account = await getAccount(cat.accountCode);

      await ctx.db.insert("expenseCategories", {
        categoryName: cat.categoryName,
        linkedAccountId: account._id,
        requiresApproval: cat.requiresApproval,
        approvalThreshold: cat.approvalThreshold,
        description: cat.description,
        isActive: true,
        createdBy: undefined,
      });

      created++;
    }

    return {
      success: true,
      message: `Successfully seeded ${created} expense categories`,
      categoriesCreated: created,
    };
  },
});



