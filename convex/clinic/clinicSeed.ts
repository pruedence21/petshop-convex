import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Seed default clinic data
export const seedClinicData = mutation({
  args: {},
  returns: v.object({
    message: v.string(),
    categoriesCreated: v.number(),
    servicesCreated: v.number(),
    staffCreated: v.number(),
  }),
  handler: async (ctx, args) => {
    // Check if already seeded
    const existingStaff = await ctx.db.query("clinicStaff").collect();
    if (existingStaff.length > 0) {
      return {
        message: "Clinic data already seeded",
        categoriesCreated: 0,
        servicesCreated: 0,
        staffCreated: 0,
      };
    }

    // Get first branch for staff assignment
    const branches = await ctx.db.query("branches").collect();
    const firstBranch = branches.find((b: any) => !b.deletedAt && b.isActive);

    if (!firstBranch) {
      throw new Error("No active branch found. Please create a branch first.");
    }

    // Get or create default category and brand for services
    const categories = await ctx.db.query("productCategories").collect();
    let serviceCategory = categories.find((c: any) => c.code === "SERVICE");

    if (!serviceCategory) {
      const serviceCategoryId = await ctx.db.insert("productCategories", {
        code: "SERVICE",
        name: "Layanan Klinik",
        description: "Layanan medis, grooming, dan penitipan",
        isActive: true,
        createdBy: undefined,
      });
      const category = await ctx.db.get(serviceCategoryId);
      if (!category) throw new Error("Failed to create service category");
      serviceCategory = category;
    }

    const brands = await ctx.db.query("brands").collect();
    let serviceBrand = brands.find((b: any) => b.code === "CLINIC");

    if (!serviceBrand) {
      const serviceBrandId = await ctx.db.insert("brands", {
        code: "CLINIC",
        name: "Petshop Clinic",
        description: "Internal clinic services",
        isActive: true,
        createdBy: undefined,
      });
      const brand = await ctx.db.get(serviceBrandId);
      if (!brand) throw new Error("Failed to create service brand");
      serviceBrand = brand;
    }

    const units = await ctx.db.query("units").collect();
    let serviceUnit = units.find((u: any) => u.code === "SERVICE");

    if (!serviceUnit) {
      const serviceUnitId = await ctx.db.insert("units", {
        code: "SERVICE",
        name: "Service",
        description: "Unit for services",
        isBase: true,
        isActive: true,
        createdBy: undefined,
      });
      const unit = await ctx.db.get(serviceUnitId);
      if (!unit) throw new Error("Failed to create service unit");
      serviceUnit = unit;
    }

    // Create Services as Products
    const services = [
      // Medical Services
      {
        sku: "SVC-MED001",
        name: "Checkup General",
        description: "Pemeriksaan kesehatan umum",
        basePrice: 150000,
        duration: 30,
        type: "service",
      },
      {
        sku: "SVC-MED002",
        name: "Vaksinasi Rabies",
        description: "Vaksinasi rabies untuk anjing dan kucing",
        basePrice: 250000,
        duration: 15,
        type: "procedure",
      },
      {
        sku: "SVC-MED003",
        name: "Vaksinasi Distemper",
        description: "Vaksinasi distemper (DHPPI) untuk anjing",
        basePrice: 200000,
        duration: 15,
        type: "procedure",
      },
      {
        sku: "SVC-MED004",
        name: "Sterilisasi Kucing",
        description: "Operasi sterilisasi untuk kucing",
        basePrice: 500000,
        duration: 120,
        type: "procedure",
      },
      {
        sku: "SVC-MED005",
        name: "Konsultasi Dokter",
        description: "Konsultasi kesehatan dengan dokter hewan",
        basePrice: 100000,
        duration: 30,
        type: "service",
      },
      // Grooming Services
      {
        sku: "SVC-GRM001",
        name: "Grooming Basic",
        description: "Mandi, blow dry, potong kuku",
        basePrice: 200000,
        duration: 120,
        type: "service",
      },
      {
        sku: "SVC-GRM002",
        name: "Grooming Premium",
        description: "Mandi, blow dry, potong kuku, styling, ear cleaning",
        basePrice: 350000,
        duration: 180,
        type: "service",
      },
      {
        sku: "SVC-GRM003",
        name: "Potong Kuku",
        description: "Potong kuku dan filing",
        basePrice: 50000,
        duration: 15,
        type: "service",
      },
      // Boarding Services
      {
        sku: "SVC-BRD001",
        name: "Penitipan Kucing - 1 Hari",
        description: "Penitipan kucing per hari",
        basePrice: 75000,
        duration: 30,
        type: "service",
      },
      {
        sku: "SVC-BRD002",
        name: "Penitipan Anjing - 1 Hari",
        description: "Penitipan anjing per hari",
        basePrice: 100000,
        duration: 30,
        type: "service",
      },
      // Medicine Samples
      {
        sku: "MED-001",
        name: "Amoxicillin 500mg",
        description: "Antibiotik untuk infeksi bakteri",
        basePrice: 5000,
        duration: undefined,
        type: "medicine",
      },
      {
        sku: "MED-002",
        name: "Paracetamol Vet 100mg",
        description: "Pereda nyeri dan demam untuk hewan",
        basePrice: 3000,
        duration: undefined,
        type: "medicine",
      },
    ];

    let servicesCreated = 0;
    for (const service of services) {
      await ctx.db.insert("products", {
        sku: service.sku,
        name: service.name,
        description: service.description,
        categoryId: serviceCategory._id,
        brandId: serviceBrand._id,
        unitId: serviceUnit._id,
        purchasePrice: service.type === "medicine" ? service.basePrice * 0.7 : 0, // Medicine has purchase price
        sellingPrice: service.basePrice,
        minStock: service.type === "medicine" ? 10 : 0,
        maxStock: service.type === "medicine" ? 100 : 0,
        hasVariants: false,
        type: service.type,
        serviceDuration: service.duration,
        isActive: true,
        createdBy: undefined,
      });
      servicesCreated++;
    }

    // Create Sample Staff
    const staff = [
      {
        code: "DRH001",
        name: "drh. Budi Santoso",
        role: "Veterinarian",
        specialization: "Small Animals",
        phone: "08123456789",
        email: "budi@petshop.com",
        branchId: firstBranch._id,
      },
      {
        code: "DRH002",
        name: "drh. Siti Nurhaliza",
        role: "Veterinarian",
        specialization: "Cats & Dogs",
        phone: "08129876543",
        email: "siti@petshop.com",
        branchId: firstBranch._id,
      },
      {
        code: "GRM001",
        name: "Andi Groomer",
        role: "Groomer",
        specialization: "All Breeds",
        phone: "08135556677",
        email: "andi@petshop.com",
        branchId: firstBranch._id,
      },
    ];

    let staffCreated = 0;
    for (const member of staff) {
      await ctx.db.insert("clinicStaff", {
        ...member,
        isActive: true,
        createdBy: undefined,
      });
      staffCreated++;
    }

    return {
      message: "Clinic data seeded successfully",
      categoriesCreated: 3, // category, brand, unit
      servicesCreated, // 10 services + 2 medicines = 12 items
      staffCreated,
    };
  },
});

// Clear all clinic data (for development/testing)
export const clearClinicData = mutation({
  args: {},
  returns: v.object({
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Delete in reverse order to avoid foreign key issues
    const appointments = await ctx.db.query("clinicAppointments").collect();
    for (const apt of appointments) {
      await ctx.db.delete(apt._id);
    }

    const services = await ctx.db.query("clinicAppointmentServices").collect();
    for (const service of services) {
      await ctx.db.delete(service._id);
    }

    const payments = await ctx.db.query("clinicPayments").collect();
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    const staff = await ctx.db.query("clinicStaff").collect();
    for (const member of staff) {
      await ctx.db.delete(member._id);
    }

    const clinicServices = await ctx.db.query("clinicServices").collect();
    for (const service of clinicServices) {
      await ctx.db.delete(service._id);
    }

    const categories = await ctx.db.query("clinicServiceCategories").collect();
    for (const category of categories) {
      await ctx.db.delete(category._id);
    }

    return {
      message: "All clinic data cleared",
    };
  },
});



