/**
 * Admin Mutations
 * Mutations untuk create dan manage admin users
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create admin user with hashed password
 */
export const createAdminUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    hashedPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return {
        success: false,
        message: `User dengan email ${args.email} sudah ada`,
      };
    }

    // 2. Check if Admin role exists
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      return {
        success: false,
        message: "Admin role tidak ditemukan. Jalankan adminSeed:setupAdminRole terlebih dahulu",
      };
    }

    // 3. Create user in users table
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      emailVerificationTime: Date.now(),
    });

    // 4. Create auth account with hashed password
    await ctx.db.insert("authAccounts", {
      userId: userId,
      provider: "password",
      providerAccountId: args.email,
      secret: args.hashedPassword,
    });

    // 5. Create user profile
    await ctx.db.insert("userProfiles", {
      userId: userId as unknown as string,
      email: args.email,
      name: args.name,
      phone: args.phone,
      roleId: adminRole._id,
      isActive: true,
    });

    // 6. Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: userId as unknown as string,
      roleId: adminRole._id,
      assignedAt: Date.now(),
      isActive: true,
    });

    return {
      success: true,
      message: `Admin account berhasil dibuat untuk ${args.email}. Silakan login dengan email dan password yang sudah dibuat.`,
      userId: userId as unknown as string,
    };
  },
});

/**
 * Update password for existing user
 */
export const updateUserPassword = mutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Find user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return {
        success: false,
        message: `User dengan email ${args.email} tidak ditemukan`,
      };
    }

    // 2. Find and update auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => 
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .first();

    if (authAccount) {
      await ctx.db.patch(authAccount._id, {
        secret: args.hashedPassword,
      });

      return {
        success: true,
        message: `Password berhasil diupdate untuk ${args.email}`,
      };
    } else {
      // Create new auth account if doesn't exist
      await ctx.db.insert("authAccounts", {
        userId: user._id,
        provider: "password",
        providerAccountId: args.email,
        secret: args.hashedPassword,
      });

      return {
        success: true,
        message: `Auth account dan password berhasil dibuat untuk ${args.email}`,
      };
    }
  },
});


