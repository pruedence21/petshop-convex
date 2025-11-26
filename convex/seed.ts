import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ==================== MASTER DATA SEEDING ====================

export const seedMasterData = mutation({
    args: {},
    returns: v.object({
        unitsCreated: v.number(),
        categoriesCreated: v.number(),
        brandsCreated: v.number(),
        animalCategoriesCreated: v.number(),
    }),
    handler: async (ctx) => {
        let unitsCreated = 0;
        let categoriesCreated = 0;
        let brandsCreated = 0;
        let animalCategoriesCreated = 0;

        // 1. Seed Units
        const units = [
            { code: "PCS", name: "Pieces", isBase: true },
            { code: "KG", name: "Kilogram", isBase: true },
            { code: "GR", name: "Gram", isBase: false },
            { code: "L", name: "Liter", isBase: true },
            { code: "ML", name: "Milliliter", isBase: false },
            { code: "BOX", name: "Box", isBase: false },
            { code: "PACK", name: "Pack", isBase: false },
            { code: "SACHET", name: "Sachet", isBase: false },
            { code: "BTL", name: "Botol", isBase: false },
            { code: "KALENG", name: "Kaleng", isBase: false },
        ];

        for (const unit of units) {
            const existing = await ctx.db
                .query("units")
                .withIndex("by_code", (q) => q.eq("code", unit.code))
                .first();

            if (!existing) {
                await ctx.db.insert("units", {
                    code: unit.code,
                    name: unit.name,
                    isBase: unit.isBase,
                    isActive: true,
                });
                unitsCreated++;
            }
        }

        // 2. Seed Product Categories
        const categories = [
            { code: "FOOD", name: "Makanan Hewan", icon: "bone" },
            { code: "ACC", name: "Aksesoris", icon: "shopping-bag" },
            { code: "MED", name: "Obat & Vitamin", icon: "pill" },
            { code: "GROOM", name: "Grooming", icon: "scissors" },
            { code: "TOYS", name: "Mainan", icon: "gamepad-2" },
            { code: "CAGE", name: "Kandang & Bedding", icon: "home" },
            { code: "SVC", name: "Layanan Jasa", icon: "stethoscope" },
        ];

        for (const cat of categories) {
            const existing = await ctx.db
                .query("productCategories")
                .withIndex("by_code", (q) => q.eq("code", cat.code))
                .first();

            if (!existing) {
                await ctx.db.insert("productCategories", {
                    code: cat.code,
                    name: cat.name,
                    icon: cat.icon,
                    isActive: true,
                });
                categoriesCreated++;
            }
        }

        // 3. Seed Brands
        const brands = [
            { code: "RC", name: "Royal Canin" },
            { code: "WHIS", name: "Whiskas" },
            { code: "PED", name: "Pedigree" },
            { code: "MEO", name: "Me-O" },
            { code: "PRO", name: "Pro Plan" },
            { code: "BOLT", name: "Bolt" },
            { code: "GEN", name: "Generic" }, // For unbranded items
        ];

        for (const brand of brands) {
            const existing = await ctx.db
                .query("brands")
                .withIndex("by_code", (q) => q.eq("code", brand.code))
                .first();

            if (!existing) {
                await ctx.db.insert("brands", {
                    code: brand.code,
                    name: brand.name,
                    isActive: true,
                });
                brandsCreated++;
            }
        }

        // 4. Seed Animal Categories
        const animalCategories = [
            { name: "Anjing", icon: "dog" },
            { name: "Kucing", icon: "cat" },
            { name: "Burung", icon: "bird" },
            { name: "Ikan", icon: "fish" },
            { name: "Kelinci", icon: "rabbit" },
            { name: "Hamster", icon: "rat" },
            { name: "Reptil", icon: "snake" },
            { name: "Lainnya", icon: "paw-print" },
        ];

        for (const animal of animalCategories) {
            const existing = await ctx.db
                .query("animalCategories")
                .withIndex("by_name", (q) => q.eq("name", animal.name))
                .first();

            if (!existing) {
                await ctx.db.insert("animalCategories", {
                    name: animal.name,
                    icon: animal.icon,
                    isActive: true,
                });
                animalCategoriesCreated++;
            }
        }

        return {
            unitsCreated,
            categoriesCreated,
            brandsCreated,
            animalCategoriesCreated,
        };
    },
});

// ==================== GENERAL CUSTOMER SEEDING ====================

export const seedGeneralCustomer = mutation({
    args: {},
    returns: v.object({
        success: v.boolean(),
        message: v.string(),
        customerId: v.optional(v.id("customers")),
    }),
    handler: async (ctx) => {
        const existing = await ctx.db
            .query("customers")
            .withIndex("by_code", (q) => q.eq("code", "UMUM"))
            .first();

        if (existing) {
            return {
                success: true,
                message: "General customer already exists",
                customerId: existing._id,
            };
        }

        const customerId = await ctx.db.insert("customers", {
            code: "UMUM",
            name: "Pelanggan Umum",
            phone: "000000000000",
            address: "-",
            isActive: true,
            notes: "Default customer for walk-in sales",
        });

        return {
            success: true,
            message: "General customer created successfully",
            customerId,
        };
    },
});

// ==================== MASTER SEED ACTION ====================

export const seedAll = action({
    args: {},
    handler: async (ctx) => {
        const results = {
            accounting: "Skipped",
            masterData: null as any,
            generalCustomer: null as any,
            errors: [] as string[],
        };

        // 1. Seed Chart of Accounts
        try {
            // Check if accounts exist first to avoid error from existing seed function
            // We can't easily check DB from action, so we just try calling it.
            // The existing seedChartOfAccounts throws if already seeded.
            // We'll try-catch it.
            await ctx.runMutation(api.finance.accountingSeed.seedChartOfAccounts);
            results.accounting = "Success";
        } catch (e: any) {
            if (e.message.includes("already seeded")) {
                results.accounting = "Already seeded";
            } else {
                results.errors.push(`Accounting seed failed: ${e.message}`);
            }
        }

        // 2. Seed Expense Categories
        try {
            await ctx.runMutation(api.finance.expenseSeed.seedExpenseCategories);
        } catch (e: any) {
            results.errors.push(`Expense categories seed failed: ${e.message}`);
        }


        // 3. Seed Master Data
        try {
            results.masterData = await ctx.runMutation(api.seed.seedMasterData);
        } catch (e: any) {
            results.errors.push(`Master data seed failed: ${e.message}`);
        }

        // 4. Seed General Customer
        try {
            results.generalCustomer = await ctx.runMutation(api.seed.seedGeneralCustomer);
        } catch (e: any) {
            results.errors.push(`General customer seed failed: ${e.message}`);
        }

        return results;
    },
});
