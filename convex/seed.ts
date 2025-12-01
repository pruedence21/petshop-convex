import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ==================== MASTER DATA SEEDING ====================
// Updated to include detailed products


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

// ==================== PRODUCT SEEDING ====================

export const seedProducts = mutation({
    args: {},
    returns: v.object({
        productsCreated: v.number(),
        medicinesCreated: v.number(),
        proceduresCreated: v.number(),
        servicesCreated: v.number(),
    }),
    handler: async (ctx) => {
        let productsCreated = 0;
        let medicinesCreated = 0;
        let proceduresCreated = 0;
        let servicesCreated = 0;

        // Helper to get ID by code/name
        const getUnit = async (code: string) => {
            const unit = await ctx.db.query("units").withIndex("by_code", q => q.eq("code", code)).first();
            return unit?._id;
        };
        const getCategory = async (code: string) => {
            const cat = await ctx.db.query("productCategories").withIndex("by_code", q => q.eq("code", code)).first();
            return cat?._id;
        };
        const getBrand = async (code: string) => {
            const brand = await ctx.db.query("brands").withIndex("by_code", q => q.eq("code", code)).first();
            return brand?._id;
        };

        const pcsId = await getUnit("PCS");
        const foodCatId = await getCategory("FOOD");
        const accCatId = await getCategory("ACC");
        const medCatId = await getCategory("MED");
        const svcCatId = await getCategory("SVC");
        const rcBrandId = await getBrand("RC");
        const genBrandId = await getBrand("GEN");

        if (!pcsId || !foodCatId || !accCatId || !medCatId || !svcCatId || !rcBrandId || !genBrandId) {
            throw new Error("Missing master data. Run seedMasterData first.");
        }

        // 1. Seed Products (20 items)
        const products = [
            { sku: "PRD001", name: "Royal Canin Adult 2kg", price: 250000, cat: foodCatId, brand: rcBrandId },
            { sku: "PRD002", name: "Royal Canin Kitten 2kg", price: 260000, cat: foodCatId, brand: rcBrandId },
            { sku: "PRD003", name: "Royal Canin Hair & Skin 2kg", price: 270000, cat: foodCatId, brand: rcBrandId },
            { sku: "PRD004", name: "Whiskas Tuna 1.2kg", price: 65000, cat: foodCatId, brand: genBrandId },
            { sku: "PRD005", name: "Whiskas Ocean Fish 1.2kg", price: 65000, cat: foodCatId, brand: genBrandId },
            { sku: "PRD006", name: "Me-O Salmon 1.2kg", price: 55000, cat: foodCatId, brand: genBrandId },
            { sku: "PRD007", name: "Bolt Dog Food 20kg", price: 350000, cat: foodCatId, brand: genBrandId },
            { sku: "PRD008", name: "Pedigree Chicken 10kg", price: 280000, cat: foodCatId, brand: genBrandId },
            { sku: "PRD009", name: "Kalung Kucing Lonceng", price: 15000, cat: accCatId, brand: genBrandId },
            { sku: "PRD010", name: "Kalung Anjing Kulit", price: 45000, cat: accCatId, brand: genBrandId },
            { sku: "PRD011", name: "Tempat Makan Double", price: 35000, cat: accCatId, brand: genBrandId },
            { sku: "PRD012", name: "Botol Minum Gantung", price: 25000, cat: accCatId, brand: genBrandId },
            { sku: "PRD013", name: "Mainan Tikus", price: 10000, cat: accCatId, brand: genBrandId },
            { sku: "PRD014", name: "Mainan Tulang Karet", price: 20000, cat: accCatId, brand: genBrandId },
            { sku: "PRD015", name: "Pasir Kucing Wangi 5L", price: 35000, cat: accCatId, brand: genBrandId },
            { sku: "PRD016", name: "Pasir Zeolit 20kg", price: 45000, cat: accCatId, brand: genBrandId },
            { sku: "PRD017", name: "Shampoo Kucing 250ml", price: 30000, cat: accCatId, brand: genBrandId },
            { sku: "PRD018", name: "Shampoo Anjing 250ml", price: 30000, cat: accCatId, brand: genBrandId },
            { sku: "PRD019", name: "Sisir Kucing", price: 25000, cat: accCatId, brand: genBrandId },
            { sku: "PRD020", name: "Gunting Kuku Hewan", price: 35000, cat: accCatId, brand: genBrandId },
        ];

        for (const p of products) {
            const existing = await ctx.db.query("products").withIndex("by_sku", q => q.eq("sku", p.sku)).first();
            if (!existing) {
                await ctx.db.insert("products", {
                    sku: p.sku,
                    name: p.name,
                    categoryId: p.cat,
                    brandId: p.brand,
                    unitId: pcsId,
                    purchasePrice: p.price * 0.7,
                    sellingPrice: p.price,
                    minStock: 5,
                    maxStock: 50,
                    hasVariants: false,
                    type: "product",
                    isActive: true,
                });
                productsCreated++;
            }
        }

        // 2. Seed Medicines (20 items)
        const medicines = [
            { sku: "MED001", name: "Amoxicillin 500mg", price: 5000 },
            { sku: "MED002", name: "Doxycycline 100mg", price: 8000 },
            { sku: "MED003", name: "Cefalexin 250mg", price: 7000 },
            { sku: "MED004", name: "Ketoconazole 200mg", price: 6000 },
            { sku: "MED005", name: "Ivermectin Drop", price: 45000 },
            { sku: "MED006", name: "Obat Cacing Drontal Cat", price: 25000 },
            { sku: "MED007", name: "Obat Cacing Drontal Dog", price: 35000 },
            { sku: "MED008", name: "Vitamin Nutri-Plus Gel", price: 120000 },
            { sku: "MED009", name: "Vitamin Virbac Megaderm", price: 150000 },
            { sku: "MED010", name: "Salep Kulit Scabies", price: 35000 },
            { sku: "MED011", name: "Salep Mata Terramycin", price: 45000 },
            { sku: "MED012", name: "Obat Tetes Telinga", price: 40000 },
            { sku: "MED013", name: "Biodin Spray", price: 55000 },
            { sku: "MED014", name: "Betadine 30ml", price: 15000 },
            { sku: "MED015", name: "Alkohol 70% 100ml", price: 10000 },
            { sku: "MED016", name: "Kapas Pembalut", price: 5000 },
            { sku: "MED017", name: "Perban Elastis", price: 15000 },
            { sku: "MED018", name: "Spuit 1ml", price: 2000 },
            { sku: "MED019", name: "Spuit 3ml", price: 3000 },
            { sku: "MED020", name: "Infus Set", price: 25000 },
        ];

        for (const m of medicines) {
            const existing = await ctx.db.query("products").withIndex("by_sku", q => q.eq("sku", m.sku)).first();
            if (!existing) {
                await ctx.db.insert("products", {
                    sku: m.sku,
                    name: m.name,
                    categoryId: medCatId,
                    brandId: genBrandId,
                    unitId: pcsId,
                    purchasePrice: m.price * 0.6,
                    sellingPrice: m.price,
                    minStock: 10,
                    maxStock: 100,
                    hasVariants: false,
                    type: "medicine",
                    isActive: true,
                });
                medicinesCreated++;
            }
        }

        // 3. Seed Procedures (20 items)
        const procedures = [
            { sku: "PRC001", name: "Konsultasi Dokter", price: 50000 },
            { sku: "PRC002", name: "Suntik Vitamin", price: 35000 },
            { sku: "PRC003", name: "Suntik Scabies", price: 45000 },
            { sku: "PRC004", name: "Suntik Antibiotik", price: 40000 },
            { sku: "PRC005", name: "Vaksin Rabies", price: 150000 },
            { sku: "PRC006", name: "Vaksin Tricat", price: 180000 },
            { sku: "PRC007", name: "Vaksin Tetracat", price: 200000 },
            { sku: "PRC008", name: "Vaksin Parvo", price: 150000 },
            { sku: "PRC009", name: "Vaksin Eurican 4", price: 250000 },
            { sku: "PRC010", name: "Vaksin Eurican 6", price: 300000 },
            { sku: "PRC011", name: "Steril Kucing Jantan", price: 400000 },
            { sku: "PRC012", name: "Steril Kucing Betina", price: 600000 },
            { sku: "PRC013", name: "Steril Anjing Jantan", price: 800000 },
            { sku: "PRC014", name: "Steril Anjing Betina", price: 1200000 },
            { sku: "PRC015", name: "Scaling Gigi Ringan", price: 300000 },
            { sku: "PRC016", name: "Scaling Gigi Berat", price: 500000 },
            { sku: "PRC017", name: "Operasi Caesar", price: 1500000 },
            { sku: "PRC018", name: "Operasi Hernia", price: 800000 },
            { sku: "PRC019", name: "Rawat Inap (per hari)", price: 75000 },
            { sku: "PRC020", name: "Nebulizer", price: 50000 },
        ];

        for (const p of procedures) {
            const existing = await ctx.db.query("products").withIndex("by_sku", q => q.eq("sku", p.sku)).first();
            if (!existing) {
                await ctx.db.insert("products", {
                    sku: p.sku,
                    name: p.name,
                    categoryId: svcCatId,
                    brandId: genBrandId,
                    unitId: pcsId,
                    purchasePrice: 0,
                    sellingPrice: p.price,
                    minStock: 0,
                    maxStock: 0,
                    hasVariants: false,
                    type: "procedure",
                    serviceDuration: 30,
                    isActive: true,
                });
                proceduresCreated++;
            }
        }

        // 4. Seed Services (20 items)
        const services = [
            { sku: "SVC001", name: "Grooming Mandi Sehat Kucing", price: 50000 },
            { sku: "SVC002", name: "Grooming Mandi Jamur Kucing", price: 65000 },
            { sku: "SVC003", name: "Grooming Mandi Kutu Kucing", price: 70000 },
            { sku: "SVC004", name: "Grooming Lengkap Kucing", price: 85000 },
            { sku: "SVC005", name: "Grooming Mandi Sehat Anjing S", price: 60000 },
            { sku: "SVC006", name: "Grooming Mandi Sehat Anjing M", price: 75000 },
            { sku: "SVC007", name: "Grooming Mandi Sehat Anjing L", price: 100000 },
            { sku: "SVC008", name: "Grooming Mandi Jamur Anjing S", price: 75000 },
            { sku: "SVC009", name: "Grooming Mandi Kutu Anjing S", price: 80000 },
            { sku: "SVC010", name: "Cukur Botak Kucing", price: 50000 },
            { sku: "SVC011", name: "Cukur Model Kucing", price: 75000 },
            { sku: "SVC012", name: "Cukur Botak Anjing", price: 60000 },
            { sku: "SVC013", name: "Cukur Model Anjing", price: 100000 },
            { sku: "SVC014", name: "Potong Kuku", price: 15000 },
            { sku: "SVC015", name: "Bersih Telinga", price: 15000 },
            { sku: "SVC016", name: "Penitipan Kucing (per hari)", price: 35000 },
            { sku: "SVC017", name: "Penitipan Anjing S (per hari)", price: 50000 },
            { sku: "SVC018", name: "Penitipan Anjing M (per hari)", price: 75000 },
            { sku: "SVC019", name: "Penitipan Anjing L (per hari)", price: 100000 },
            { sku: "SVC020", name: "Antar Jemput (per 5km)", price: 15000 },
        ];

        for (const s of services) {
            const existing = await ctx.db.query("products").withIndex("by_sku", q => q.eq("sku", s.sku)).first();
            if (!existing) {
                await ctx.db.insert("products", {
                    sku: s.sku,
                    name: s.name,
                    categoryId: svcCatId,
                    brandId: genBrandId,
                    unitId: pcsId,
                    purchasePrice: 0,
                    sellingPrice: s.price,
                    minStock: 0,
                    maxStock: 0,
                    hasVariants: false,
                    type: "service",
                    serviceDuration: 60,
                    isActive: true,
                });
                servicesCreated++;
            }
        }

        return {
            productsCreated,
            medicinesCreated,
            proceduresCreated,
            servicesCreated,
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
            bankAccounts: null as any,
            expenseCategories: null as any,
            clinic: null as any,
            generalCustomer: null as any,
            products: null as any,
            errors: [] as string[],
        };

        // 1. Seed Chart of Accounts (Base Financial Structure)
        try {
            await ctx.runMutation(api.finance.accountingSeed.seedChartOfAccounts);
            results.accounting = "Success";
        } catch (e: any) {
            if (e.message.includes("already seeded")) {
                results.accounting = "Already seeded";
            } else {
                results.errors.push(`Accounting seed failed: ${e.message}`);
            }
        }

        // 2. Seed Master Data (Branches, Units, Categories, Brands, Suppliers)
        try {
            results.masterData = await ctx.runMutation(internal.master_data.masterDataSeed.seedMasterData);
        } catch (e: any) {
            results.errors.push(`Master data seed failed: ${e.message}`);
        }

        // 3. Seed Bank Accounts (Requires CoA)
        try {
            results.bankAccounts = await ctx.runMutation(api.finance.bankSeed.seedBankAccounts);
        } catch (e: any) {
            results.errors.push(`Bank accounts seed failed: ${e.message}`);
        }

        // 4. Seed Expense Categories
        try {
            results.expenseCategories = await ctx.runMutation(api.finance.expenseSeed.seedExpenseCategories);
        } catch (e: any) {
            results.errors.push(`Expense categories seed failed: ${e.message}`);
        }

        // 5. Seed Clinic Data (Services, Staff - Requires Branch from Master Data)
        try {
            results.clinic = await ctx.runMutation(api.clinic.clinicSeed.seedClinicData);
        } catch (e: any) {
            results.errors.push(`Clinic seed failed: ${e.message}`);
        }

        // 6. Seed General Customer
        try {
            results.generalCustomer = await ctx.runMutation(api.seed.seedGeneralCustomer);
        } catch (e: any) {
            results.errors.push(`General customer seed failed: ${e.message}`);
        }

        // 7. Seed Products (Uses IDs from Master Data)
        try {
            results.products = await ctx.runMutation(api.seed.seedProducts);
        } catch (e: any) {
            results.errors.push(`Product seed failed: ${e.message}`);
        }

        return results;
    },
});

// ==================== INITIAL STOCK SEEDING ====================

export const seedInitialStock = action({
    args: {},
    handler: async (ctx) => {
        const results = {
            success: true,
            processed: 0,
            errors: [] as string[],
        };

        try {
            // 1. Get PUSAT Branch
            const branches = await ctx.runQuery(api.master_data.branches.list, {});
            const pusatBranch = branches.find((b: any) => b.code === "PUSAT");

            if (!pusatBranch) {
                throw new Error("Branch PUSAT not found");
            }

            const branchId = pusatBranch._id;

            // 2. Get All Products
            const allProducts = await ctx.runQuery(api.inventory.products.list, { includeInactive: false });

            // Filter for "product" and "medicine" types
            const targetProducts = allProducts.filter(
                (p: any) => p.type === "product" || p.type === "medicine"
            );

            console.log(`Found ${targetProducts.length} products to seed stock for.`);

            // 3. Iterate and Add Stock
            for (const product of targetProducts) {
                try {
                    const isMedicine = product.type === "medicine";
                    const batchNumber = isMedicine ? "BATCH-INIT-001" : undefined;
                    // 1 year from now for expiry
                    const expiredDate = isMedicine ? Date.now() + 365 * 24 * 60 * 60 * 1000 : undefined;

                    if (product.hasVariants) {
                        // Fetch variants
                        const variants = await ctx.runQuery(api.inventory.products.getVariants, { productId: product._id });

                        for (const variant of variants) {
                            await ctx.runMutation(api.inventory.productStock.addInitialStock, {
                                branchId,
                                productId: product._id,
                                variantId: variant._id,
                                quantity: 100,
                                unitCost: variant.purchasePrice || product.purchasePrice || 0,
                                batchNumber,
                                expiredDate,
                                notes: "Initial Stock Seeding",
                            });
                            results.processed++;
                        }
                    } else {
                        // No variants
                        await ctx.runMutation(api.inventory.productStock.addInitialStock, {
                            branchId,
                            productId: product._id,
                            quantity: 100,
                            unitCost: product.purchasePrice || 0,
                            batchNumber,
                            expiredDate,
                            notes: "Initial Stock Seeding",
                        });
                        results.processed++;
                    }
                } catch (err: any) {
                    console.error(`Failed to seed stock for product ${product.name}:`, err);
                    results.errors.push(`Product ${product.name}: ${err.message}`);
                }
            }

        } catch (error: any) {
            results.success = false;
            results.errors.push(`Fatal error: ${error.message}`);
        }

        return results;
    },
});
