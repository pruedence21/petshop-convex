/**
 * Master Data Seed untuk Production
 * Membuat data master dengan konteks Indonesia
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedMasterData = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    summary: v.object({
      branches: v.number(),
      brands: v.number(),
      units: v.number(),
      animalCategories: v.number(),
      productCategories: v.number(),
      productSubcategories: v.number(),
      clinicServiceCategories: v.number(),
      clinicStaff: v.number(),
      suppliers: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const summary = {
      branches: 0,
      brands: 0,
      units: 0,
      animalCategories: 0,
      productCategories: 0,
      productSubcategories: 0,
      clinicServiceCategories: 0,
      clinicStaff: 0,
      suppliers: 0,
    };

    // 1. CREATE BRANCH PUSAT
    const existingBranch = await ctx.db
      .query("branches")
      .withIndex("by_code", (q) => q.eq("code", "PUSAT"))
      .first();

    let branchId;
    if (!existingBranch) {
      branchId = await ctx.db.insert("branches", {
        code: "PUSAT",
        name: "Cabang Pusat",
        address: "Jl. Veteran No. 123",
        city: "Jakarta",
        province: "DKI Jakarta",
        postalCode: "12345",
        phone: "021-12345678",
        email: "pusat@petshop.co.id",
        isActive: true,
      });
      summary.branches = 1;
    } else {
      branchId = existingBranch._id;
    }

    // 2. CREATE BRANDS (10 brands lokal Indonesia)
    const brands = [
      { code: "PEDIGREE", name: "Pedigree", description: "Makanan anjing berkualitas" },
      { code: "WHISKAS", name: "Whiskas", description: "Makanan kucing pilihan" },
      { code: "ROYAL", name: "Royal Canin", description: "Premium pet food" },
      { code: "PROPLAN", name: "Pro Plan", description: "Nutrisi lengkap hewan" },
      { code: "MEOOW", name: "Me-O", description: "Makanan kucing ekonomis" },
      { code: "BOLT", name: "Bolt", description: "Makanan anjing lokal" },
      { code: "EQUILIBRIO", name: "Equilibrio", description: "Natural pet food" },
      { code: "PROFELIN", name: "Profeline", description: "Cat food premium" },
      { code: "KITCHEN", name: "Kitchen Flavor", description: "Makanan hewan organik" },
      { code: "CPPETINDO", name: "CP Petindo", description: "Brand lokal terpercaya" },
    ];

    for (const brand of brands) {
      const existing = await ctx.db
        .query("brands")
        .withIndex("by_code", (q) => q.eq("code", brand.code))
        .first();

      if (!existing) {
        await ctx.db.insert("brands", {
          ...brand,
          isActive: true,
        });
        summary.brands++;
      }
    }

    // 3. CREATE UNITS (10 satuan)
    const units = [
      { code: "PCS", name: "Pieces", description: "Satuan per buah", isBase: true },
      { code: "KG", name: "Kilogram", description: "Satuan berat kilogram", isBase: false },
      { code: "GRAM", name: "Gram", description: "Satuan berat gram", isBase: false },
      { code: "LITER", name: "Liter", description: "Satuan volume liter", isBase: false },
      { code: "ML", name: "Mililiter", description: "Satuan volume mililiter", isBase: false },
      { code: "BOX", name: "Box", description: "Satuan per kotak", isBase: false },
      { code: "PACK", name: "Pack", description: "Satuan per pak", isBase: false },
      { code: "BOTOL", name: "Botol", description: "Satuan per botol", isBase: false },
      { code: "SACHET", name: "Sachet", description: "Satuan per sachet", isBase: false },
      { code: "KARUNG", name: "Karung", description: "Satuan per karung", isBase: false },
    ];

    for (const unit of units) {
      const existing = await ctx.db
        .query("units")
        .withIndex("by_code", (q) => q.eq("code", unit.code))
        .first();

      if (!existing) {
        await ctx.db.insert("units", {
          ...unit,
          isActive: true,
        });
        summary.units++;
      }
    }

    // 4. CREATE ANIMAL CATEGORIES (10 kategori hewan)
    const animalCategories = [
      { name: "Anjing", description: "Hewan peliharaan anjing", icon: "🐕" },
      { name: "Kucing", description: "Hewan peliharaan kucing", icon: "🐈" },
      { name: "Burung", description: "Hewan peliharaan burung", icon: "🦜" },
      { name: "Kelinci", description: "Hewan peliharaan kelinci", icon: "🐰" },
      { name: "Hamster", description: "Hewan peliharaan hamster", icon: "🐹" },
      { name: "Ikan", description: "Ikan hias", icon: "🐠" },
      { name: "Reptil", description: "Reptil peliharaan", icon: "🦎" },
      { name: "Sugar Glider", description: "Sugar glider", icon: "🐿️" },
      { name: "Landak Mini", description: "Landak mini (hedgehog)", icon: "🦔" },
      { name: "Guinea Pig", description: "Marmut/guinea pig", icon: "🐹" },
    ];

    for (const category of animalCategories) {
      const existing = await ctx.db
        .query("animalCategories")
        .withIndex("by_name", (q) => q.eq("name", category.name))
        .first();

      if (!existing) {
        await ctx.db.insert("animalCategories", {
          ...category,
          isActive: true,
        });
        summary.animalCategories++;
      }
    }

    // 5. CREATE PRODUCT CATEGORIES (10 kategori produk)
    const productCategories = [
      { code: "MAKANAN", name: "Makanan Hewan", description: "Makanan untuk hewan peliharaan" },
      { code: "SNACK", name: "Snack & Treats", description: "Camilan hewan peliharaan" },
      { code: "VITAMIN", name: "Vitamin & Suplemen", description: "Suplemen kesehatan hewan" },
      { code: "GROOMING", name: "Peralatan Grooming", description: "Alat perawatan hewan" },
      { code: "AKSESORIS", name: "Aksesoris", description: "Aksesoris hewan peliharaan" },
      { code: "KANDANG", name: "Kandang & Tempat", description: "Kandang dan tempat tidur" },
      { code: "MAINAN", name: "Mainan", description: "Mainan hewan peliharaan" },
      { code: "OBAT", name: "Obat-obatan", description: "Obat untuk hewan" },
      { code: "KEBERSIHAN", name: "Kebersihan", description: "Produk kebersihan" },
      { code: "LAINNYA", name: "Lain-lain", description: "Produk lainnya" },
    ];

    for (const category of productCategories) {
      const existing = await ctx.db
        .query("productCategories")
        .withIndex("by_code", (q) => q.eq("code", category.code))
        .first();

      if (!existing) {
        await ctx.db.insert("productCategories", {
          ...category,
          isActive: true,
        });
        summary.productCategories++;
      }
    }

    // 6. CREATE PRODUCT SUBCATEGORIES (10 subkategori untuk Makanan)
    const makananCategory = await ctx.db
      .query("productCategories")
      .withIndex("by_code", (q) => q.eq("code", "MAKANAN"))
      .first();

    if (makananCategory) {
      const subcategories = [
        { code: "MAKANAN-KERING", name: "Makanan Kering", description: "Dry food" },
        { code: "MAKANAN-BASAH", name: "Makanan Basah", description: "Wet food" },
        { code: "MAKANAN-KALENG", name: "Makanan Kaleng", description: "Canned food" },
        { code: "MAKANAN-PUPPY", name: "Makanan Anak Anjing", description: "Puppy food" },
        { code: "MAKANAN-KITTEN", name: "Makanan Anak Kucing", description: "Kitten food" },
        { code: "MAKANAN-DEWASA", name: "Makanan Dewasa", description: "Adult food" },
        { code: "MAKANAN-SENIOR", name: "Makanan Senior", description: "Senior pet food" },
        { code: "MAKANAN-DIET", name: "Makanan Diet", description: "Diet food" },
        { code: "MAKANAN-MEDIS", name: "Makanan Medis", description: "Medical food" },
        { code: "MAKANAN-ORGANIK", name: "Makanan Organik", description: "Organic food" },
      ];

      for (const subcategory of subcategories) {
        const existing = await ctx.db
          .query("productSubcategories")
          .withIndex("by_code", (q) => q.eq("code", subcategory.code))
          .first();

        if (!existing) {
          await ctx.db.insert("productSubcategories", {
            ...subcategory,
            categoryId: makananCategory._id,
            isActive: true,
          });
          summary.productSubcategories++;
        }
      }
    }

    // 7. CREATE CLINIC SERVICE CATEGORIES (10 kategori layanan klinik)
    const serviceCategories = [
      { code: "PEMERIKSAAN", name: "Pemeriksaan Umum", description: "Konsultasi & pemeriksaan" },
      { code: "VAKSINASI", name: "Vaksinasi", description: "Layanan vaksinasi" },
      { code: "GROOMING", name: "Grooming", description: "Perawatan grooming" },
      { code: "OPERASI", name: "Operasi", description: "Tindakan operasi" },
      { code: "RAWAT-INAP", name: "Rawat Inap", description: "Perawatan rawat inap" },
      { code: "LABORATORIUM", name: "Laboratorium", description: "Pemeriksaan lab" },
      { code: "RONTGEN", name: "Rontgen", description: "Pemeriksaan rontgen" },
      { code: "STERILISASI", name: "Sterilisasi", description: "Sterilisasi hewan" },
      { code: "GIGI", name: "Perawatan Gigi", description: "Dental care" },
      { code: "EMERGENCY", name: "Emergency", description: "Layanan darurat" },
    ];

    for (const category of serviceCategories) {
      const existing = await ctx.db
        .query("clinicServiceCategories")
        .withIndex("by_code", (q) => q.eq("code", category.code))
        .first();

      if (!existing) {
        await ctx.db.insert("clinicServiceCategories", {
          ...category,
          isActive: true,
        });
        summary.clinicServiceCategories++;
      }
    }

    // 8. CREATE CLINIC STAFF (10 staff)
    const staffData = [
      { code: "DRH001", name: "drh. Budi Santoso", role: "Dokter Hewan", specialization: "Umum" },
      { code: "DRH002", name: "drh. Siti Nurhaliza", role: "Dokter Hewan", specialization: "Kucing" },
      { code: "DRH003", name: "drh. Ahmad Yani", role: "Dokter Hewan", specialization: "Anjing" },
      { code: "DRH004", name: "drh. Dewi Lestari", role: "Dokter Hewan", specialization: "Eksotis" },
      { code: "NURSE001", name: "Rina Wijaya", role: "Perawat", specialization: "Perawatan Umum" },
      { code: "NURSE002", name: "Andi Pratama", role: "Perawat", specialization: "Perawatan Umum" },
      { code: "GROOM001", name: "Dedi Mulyadi", role: "Groomer", specialization: "Grooming" },
      { code: "GROOM002", name: "Maya Sari", role: "Groomer", specialization: "Grooming" },
      { code: "ADMIN001", name: "Fitri Handayani", role: "Admin", specialization: "Administrasi" },
      { code: "ADMIN002", name: "Rudi Hartono", role: "Admin", specialization: "Administrasi" },
    ];

    for (const staff of staffData) {
      const existing = await ctx.db
        .query("clinicStaff")
        .withIndex("by_code", (q) => q.eq("code", staff.code))
        .first();

      if (!existing) {
        await ctx.db.insert("clinicStaff", {
          code: staff.code,
          name: staff.name,
          role: staff.role,
          specialization: staff.specialization,
          branchId: branchId,
          phone: "08123456789",
          email: `${staff.code.toLowerCase()}@petshop.co.id`,
          isActive: true,
        });
        summary.clinicStaff++;
      }
    }

    // 9. CREATE SUPPLIERS (10 supplier)
    const suppliers = [
      { code: "SUP001", name: "PT Pakan Ternak Indonesia", contactPerson: "Budi", phone: "021-1111111" },
      { code: "SUP002", name: "CV Anugrah Pet Shop", contactPerson: "Siti", phone: "021-2222222" },
      { code: "SUP003", name: "PT Royal Canin Indonesia", contactPerson: "Ahmad", phone: "021-3333333" },
      { code: "SUP004", name: "PT Mars Indonesia", contactPerson: "Dewi", phone: "021-4444444" },
      { code: "SUP005", name: "PT Nestle Purina Indonesia", contactPerson: "Rina", phone: "021-5555555" },
      { code: "SUP006", name: "CV Maju Jaya Pet", contactPerson: "Andi", phone: "021-6666666" },
      { code: "SUP007", name: "PT Charoen Pokphand Indonesia", contactPerson: "Dedi", phone: "021-7777777" },
      { code: "SUP008", name: "UD Berkah Pet", contactPerson: "Maya", phone: "021-8888888" },
      { code: "SUP009", name: "PT Sinar Jaya Pet Food", contactPerson: "Fitri", phone: "021-9999999" },
      { code: "SUP010", name: "CV Sentosa Pet Supply", contactPerson: "Rudi", phone: "021-0000000" },
    ];

    for (const supplier of suppliers) {
      const existing = await ctx.db
        .query("suppliers")
        .withIndex("by_code", (q) => q.eq("code", supplier.code))
        .first();

      if (!existing) {
        await ctx.db.insert("suppliers", {
          ...supplier,
          email: `${supplier.code.toLowerCase()}@supplier.co.id`,
          address: "Jakarta, Indonesia",
          city: "Jakarta",
          province: "DKI Jakarta",
          paymentTerms: "NET 30",
          rating: 5,
          isActive: true,
        });
        summary.suppliers++;
      }
    }

    return {
      success: true,
      message: "Master data berhasil dibuat!",
      summary,
    };
  },
});



