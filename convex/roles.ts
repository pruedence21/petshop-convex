import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Permission constants
export const PERMISSIONS = {
  // Users
  USERS_CREATE: "users.create",
  USERS_READ: "users.read",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  
  // Roles
  ROLES_CREATE: "roles.create",
  ROLES_READ: "roles.read",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  
  // Animal Categories
  ANIMAL_CATEGORIES_CREATE: "animal_categories.create",
  ANIMAL_CATEGORIES_READ: "animal_categories.read",
  ANIMAL_CATEGORIES_UPDATE: "animal_categories.update",
  ANIMAL_CATEGORIES_DELETE: "animal_categories.delete",
  
  // Units
  UNITS_CREATE: "units.create",
  UNITS_READ: "units.read",
  UNITS_UPDATE: "units.update",
  UNITS_DELETE: "units.delete",
  
  // Brands
  BRANDS_CREATE: "brands.create",
  BRANDS_READ: "brands.read",
  BRANDS_UPDATE: "brands.update",
  BRANDS_DELETE: "brands.delete",
  
  // Products
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_READ: "products.read",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  
  // Suppliers
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_READ: "suppliers.read",
  SUPPLIERS_UPDATE: "suppliers.update",
  SUPPLIERS_DELETE: "suppliers.delete",
  
  // Customers
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_DELETE: "customers.delete",
  
  // Branches
  BRANCHES_CREATE: "branches.create",
  BRANCHES_READ: "branches.read",
  BRANCHES_UPDATE: "branches.update",
  BRANCHES_DELETE: "branches.delete",
} as const;

// Default roles configuration
export const DEFAULT_ROLES = {
  ADMIN: {
    name: "Admin",
    description: "Administrator dengan akses penuh",
    permissions: Object.values(PERMISSIONS),
  },
  MANAGER: {
    name: "Manager",
    description: "Manager dengan akses manajemen",
    permissions: [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ANIMAL_CATEGORIES_CREATE,
      PERMISSIONS.ANIMAL_CATEGORIES_READ,
      PERMISSIONS.ANIMAL_CATEGORIES_UPDATE,
      PERMISSIONS.UNITS_CREATE,
      PERMISSIONS.UNITS_READ,
      PERMISSIONS.UNITS_UPDATE,
      PERMISSIONS.BRANDS_CREATE,
      PERMISSIONS.BRANDS_READ,
      PERMISSIONS.BRANDS_UPDATE,
      PERMISSIONS.PRODUCTS_CREATE,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.SUPPLIERS_CREATE,
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.SUPPLIERS_UPDATE,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.BRANCHES_READ,
    ],
  },
  STAFF: {
    name: "Staff",
    description: "Staff dengan akses terbatas",
    permissions: [
      PERMISSIONS.ANIMAL_CATEGORIES_READ,
      PERMISSIONS.UNITS_READ,
      PERMISSIONS.BRANDS_READ,
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_UPDATE,
      PERMISSIONS.SUPPLIERS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.BRANCHES_READ,
    ],
  },
  KASIR: {
    name: "Kasir",
    description: "Kasir dengan akses kasir dan customer",
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.CUSTOMERS_CREATE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_UPDATE,
      PERMISSIONS.BRANCHES_READ,
    ],
  },
} as const;

// Create role
export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add auth check
    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
      permissions: args.permissions,
      isActive: true,
      createdBy: undefined, // TODO: Get from auth
    });
    return roleId;
  },
});

// Get all roles
export const listRoles = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("roles");
    
    const roles = await query.collect();
    
    if (!args.includeInactive) {
      return roles.filter(role => role.isActive && !role.deletedAt);
    }
    
    return roles.filter(role => !role.deletedAt);
  },
});

// Get role by ID
export const getRole = query({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roleId);
  },
});

// Update role
export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { roleId, ...updates } = args;
    
    await ctx.db.patch(roleId, {
      ...updates,
      updatedBy: undefined, // TODO: Get from auth
    });
    
    return roleId;
  },
});

// Delete role (soft delete)
export const deleteRole = mutation({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roleId, {
      deletedAt: Date.now(),
      updatedBy: undefined, // TODO: Get from auth
    });
    return args.roleId;
  },
});

// Initialize default roles
export const initializeDefaultRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const existingRoles = await ctx.db.query("roles").collect();
    
    if (existingRoles.length > 0) {
      return { message: "Roles already initialized" };
    }
    
    const roleIds = [];
    
    for (const role of Object.values(DEFAULT_ROLES)) {
      const roleId = await ctx.db.insert("roles", {
        name: role.name,
        description: role.description,
        permissions: [...role.permissions],
        isActive: true,
      });
      roleIds.push(roleId);
    }
    
    return { message: "Default roles created successfully", roleIds };
  },
});
