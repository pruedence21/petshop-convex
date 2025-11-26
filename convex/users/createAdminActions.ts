/**
 * Admin Account Creation Actions
 * Actions untuk hash password dan create admin
 */

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

type MutationResult = {
  success: boolean;
  message: string;
  userId?: string;
};

const scryptAsync = promisify(scrypt);

/**
 * Hash password menggunakan scrypt (compatible dengan Convex Auth)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Create admin account dengan password yang sudah di-hash
 * 
 * Usage:
 * npx convex run --prod createAdminActions:createAdminWithPassword \
 *   '{"email":"admin@cingcing.id","password":"Admin123!","name":"Administrator"}'
 */
export const createAdminWithPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Hash password
    const hashedPassword = await hashPassword(args.password);

    // 2. Create user with profile and auth account
    const result: MutationResult = await ctx.runMutation(api.adminMutations.createAdminUser, {
      email: args.email,
      name: args.name,
      phone: args.phone,
      hashedPassword,
    });

    return result;
  },
});

/**
 * Update password untuk user yang sudah ada
 * 
 * Usage:
 * npx convex run --prod createAdminActions:updatePassword \
 *   '{"email":"admin@cingcing.id","password":"PasswordBaru123!"}'
 */
export const updatePassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Hash password baru
    const hashedPassword = await hashPassword(args.password);

    // Update di database
    const result: Omit<MutationResult, 'userId'> = await ctx.runMutation(api.adminMutations.updateUserPassword, {
      email: args.email,
      hashedPassword,
    });

    return result;
  },
});




