/**
 * Create Admin Account Mutations
 * Mutations untuk create admin user dan manage accounts
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal mutation to create admin user with hashed password
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
 * Create user and profile (without auth account)
 * User must signup via web app to set password properly
 * 
 * Usage:
 * npx convex run --prod createAdminAccount:createUserProfile \
 *   '{"email":"admin@petshop.co.id","name":"Administrator"}'
 */
export const createUserProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.string()),
    instructions: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const instructions = `
User sudah ada. Untuk login:
1. Buka: https://petshop-convex.vercel.app/signin
2. Login dengan email: ${args.email}
3. Jika lupa password, gunakan "Forgot Password"
`;
      return {
        success: false,
        message: `User dengan email ${args.email} sudah ada`,
        instructions,
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
    });

    // 4. Create user profile
    await ctx.db.insert("userProfiles", {
      userId: userId as unknown as string,
      email: args.email,
      name: args.name,
      phone: args.phone,
      roleId: adminRole._id,
      isActive: true,
    });

    // 5. Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: userId as unknown as string,
      roleId: adminRole._id,
      assignedAt: Date.now(),
      isActive: true,
    });

    const instructions = `
✅ User berhasil dibuat!

PENTING: Untuk set password yang aman, lakukan SIGN UP melalui aplikasi:

1. Buka: https://petshop-convex.vercel.app/signin
2. Klik "Sign Up" (bukan Sign In)
3. Gunakan email: ${args.email}
4. Masukkan password yang Anda inginkan
5. Convex Auth akan otomatis hash password dengan benar

Jangan gunakan setPassword function karena tidak aman!
`;

    return {
      success: true,
      message: `User profile berhasil dibuat untuk ${args.email}`,
      userId: userId as unknown as string,
      instructions,
    };
  },
});

/**
 * Alternative: Create admin using Convex Auth's built-in flow
 * 
 * This function creates a verification code that can be used
 * to complete the signup process
 */
export const createAdminWithVerification = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    instructions: v.string(),
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
        instructions: "",
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
        message: "Admin role tidak ditemukan",
        instructions: "Jalankan: npx convex run --prod adminSeed:setupAdminRole",
      };
    }

    // 3. Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      emailVerificationTime: Date.now(),
    });

    // 4. Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: userId as unknown as string,
      email: args.email,
      name: args.name,
      phone: args.phone,
      roleId: adminRole._id,
      isActive: true,
    });

    // 5. Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: userId as unknown as string,
      roleId: adminRole._id,
      assignedAt: Date.now(),
      isActive: true,
    });

    const instructions = `
✅ User berhasil dibuat dengan ID: ${userId}

Untuk set password, user perlu:
1. Buka aplikasi: https://petshop-convex.vercel.app/signin
2. Klik "Sign up" atau "Forgot Password"
3. Masukkan email: ${args.email}
4. Follow proses verifikasi untuk set password

Atau, Anda bisa set password manual melalui:
npx convex run --prod createAdminAccount:setPassword \\
  --arg '{"email":"${args.email}","password":"YourPassword123!"}'
`;

    return {
      success: true,
      message: `User berhasil dibuat untuk ${args.email}`,
      instructions,
    };
  },
});

/**
 * Delete auth account for a user (so they can re-signup with proper password hashing)
 */
export const deleteAuthAccount = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Find and delete auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", args.email)
      )
      .first();

    if (authAccount) {
      await ctx.db.delete(authAccount._id);
      return {
        success: true,
        message: `Auth account untuk ${args.email} berhasil dihapus. Silakan signup ulang melalui aplikasi.`,
      };
    }

    return {
      success: false,
      message: `Auth account untuk ${args.email} tidak ditemukan.`,
    };
  },
});

/**
 * Internal mutation to update password
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

/**
 * List all users in database
 */
export const listAllUsers = mutation({
  args: {},
  returns: v.array(v.object({
    _id: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      _id: u._id as unknown as string,
      email: u.email,
      name: u.name,
    }));
  },
});

/**
 * List all admin users
 */
export const listAdmins = mutation({
  args: {},
  returns: v.array(v.object({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    hasPassword: v.boolean(),
  })),
  handler: async (ctx) => {
    // Get Admin role
    const adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      return [];
    }

    // Get all admin profiles
    const adminProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("roleId", adminRole._id))
      .collect();

    const result = [];
    for (const profile of adminProfiles) {
      // Check if has password
      const authAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", profile.email)
        )
        .first();

      result.push({
        userId: profile.userId,
        email: profile.email,
        name: profile.name,
        isActive: profile.isActive,
        hasPassword: !!authAccount,
      });
    }

    return result;
  },
});



