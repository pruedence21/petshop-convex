/**
 * Seed Function for Initial Super Admin
 * 
 * This module provides functions to create the first super admin user
 * when the system is first set up. This is essential since public registration
 * is disabled and users can only be created by administrators.
 * 
 * Usage:
 * 1. Set environment variables in Convex dashboard:
 *    - SUPER_ADMIN_EMAIL
 *    - SUPER_ADMIN_PASSWORD (temporary, for first login)
 *    - SUPER_ADMIN_NAME
 * 
 * 2. Run the seed function once to create the super admin
 * 
 * 3. Remove or change the password after first login
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Check if super admin exists
 */
export const checkSuperAdminExists = internalQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    // Check if Admin role exists
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      return false;
    }

    // Check if any user has Admin role
    const adminUser = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("roleId", adminRole._id))
      .first();

    return !!adminUser;
  },
});

/**
 * Create super admin user profile
 * This should be called AFTER the user has been created via Convex Auth
 * 
 * Manual process:
 * 1. Temporarily enable public registration or use Convex Auth API
 * 2. Create auth account with email/password
 * 3. Get the userId from the auth system
 * 4. Call this function to link the profile with Admin role
 */
export const createSuperAdminProfile = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    profileId: v.id("userProfiles"),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      throw new Error("User profile already exists for this userId");
    }

    // Get Admin role (should exist from setupAdminRole)
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      throw new Error("Admin role does not exist. Run internal.adminSeed.setupAdminRole first!");
    }

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      roleId: adminRole._id,
      isActive: true,
      createdBy: undefined,
      updatedBy: undefined,
    });

    // Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: args.userId,
      roleId: adminRole._id,
      assignedBy: undefined,
      assignedAt: Date.now(),
      isActive: true,
    });

    return {
      profileId,
      message: `Super admin profile created successfully for ${args.email}`,
    };
  },
});

/**
 * One-time setup: Create Admin role without dynamic imports
 * 
 * This function creates the Admin role with all permissions inline.
 * To be used when dynamic imports are not supported.
 */
export const setupAdminRole = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    roleId: v.optional(v.id("roles")),
    instructions: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    // Check if Admin role already exists
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (adminRole) {
      return {
        success: true,
        message: "Admin role already exists.",
        roleId: adminRole._id,
      };
    }

    // Create Admin role with all permissions (inline list)
    const allPermissions = [
      // Users
      "users.create", "users.read", "users.update", "users.delete",
      // Roles
      "roles.create", "roles.read", "roles.update", "roles.delete",
      // Animal Categories
      "animal_categories.create", "animal_categories.read", "animal_categories.update", "animal_categories.delete",
      // Units
      "units.create", "units.read", "units.update", "units.delete",
      // Brands
      "brands.create", "brands.read", "brands.update", "brands.delete",
      // Products
      "products.create", "products.read", "products.update", "products.delete",
      // Suppliers
      "suppliers.create", "suppliers.read", "suppliers.update", "suppliers.delete",
      // Customers
      "customers.create", "customers.read", "customers.update", "customers.delete",
      // Branches
      "branches.create", "branches.read", "branches.update", "branches.delete",
      // Purchase Orders
      "purchase_orders.create", "purchase_orders.read", "purchase_orders.update", "purchase_orders.delete",
      "purchase_orders.submit", "purchase_orders.receive", "purchase_orders.cancel",
      // Stock
      "stock.read", "stock.adjust", "stock.transfer", "stock.report",
      // Sales
      "sales.create", "sales.read", "sales.update", "sales.delete", "sales.approve",
      // Expenses
      "expenses.create", "expenses.read", "expenses.update", "expenses.delete", "expenses.approve",
      // Clinic
      "clinic.create", "clinic.read", "clinic.update", "clinic.delete",
      // Hotel
      "hotel.create", "hotel.read", "hotel.update", "hotel.delete",
      // Accounting
      "accounting.read", "accounting.create", "accounting.update", "accounting.approve",
      // Reports
      "reports.view", "reports.export",
    ];

    const adminRoleId = await ctx.db.insert("roles", {
      name: "Admin",
      description: "Administrator dengan akses penuh",
      permissions: allPermissions,
      isActive: true,
      createdBy: undefined,
      updatedBy: undefined,
    });

    const instructions = `
Admin role has been created. To complete super admin setup:

1. Get userId from existing auth user (check 'users' table in Convex dashboard)

2. Run: internal.adminSeed.createSuperAdminProfile
   args: {
     userId: "<user_id_from_auth>",
     email: "<admin_email>",
     name: "<admin_name>",
     phone: "<optional_phone>"
   }
`;

    return {
      success: true,
      message: "Admin role created successfully!",
      roleId: adminRoleId,
      instructions,
    };
  },
});

/**
 * Bootstrap function: Create demo super admin
 * WARNING: This is for development/demo purposes only!
 * DO NOT use in production without changing credentials
 * 
 * This creates a demo admin account with:
 * - Email: admin@petshop.com
 * - Password: (must be set via auth provider)
 */
export const bootstrapDemoAdmin = internalMutation({
  args: {
    userId: v.string(), // Get this after creating auth account
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get Admin role (should exist from setupAdminRole)
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      throw new Error("Admin role does not exist. Run internal.adminSeed.setupAdminRole first!");
    }

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      name: "Super Administrator",
      email: "admin@petshop.com",
      phone: "+62812345678",
      roleId: adminRole._id,
      isActive: true,
      createdBy: undefined,
      updatedBy: undefined,
    });

    // Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: args.userId,
      roleId: adminRole._id,
      assignedBy: undefined,
      assignedAt: Date.now(),
      isActive: true,
    });

    return {
      success: true,
      message: `Demo admin created successfully with profile ID: ${profileId}`,
    };
  },
});

/**
 * Fix missing admin profile by email
 * Useful if the user signed up before roles were seeded
 */
export const fixAdminProfile = internalMutation({
  args: { email: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error(`User with email ${args.email} not found in auth system. Please sign up first.`);
    }

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      return `Profile already exists for ${args.email} (ID: ${existingProfile._id})`;
    }

    // Get Admin role
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      throw new Error("Admin role not found. Run setupAdminRole first.");
    }

    // Create profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: user._id,
      name: user.name || "Admin",
      email: user.email || args.email,
      roleId: adminRole._id,
      isActive: true,
      createdBy: "fix-script",
      updatedBy: "fix-script",
    });

    // Assign role
    await ctx.db.insert("userRoles", {
      userId: user._id,
      roleId: adminRole._id,
      assignedBy: "fix-script",
      assignedAt: Date.now(),
      isActive: true,
    });

    return `Successfully created admin profile for ${args.email}`;
  },
});
