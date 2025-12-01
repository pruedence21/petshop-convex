import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const hello = query({
    args: {},
    handler: async () => {
        return "Hello from debugAdmin";
    },
});

export const findAdmin = query({
    args: {},
    handler: async (ctx) => {
        // Try to find the user in the auth 'users' table
        const authUser = await ctx.db
            .query("users")
            .filter(q => q.eq(q.field("email"), "admin@cingcing.id"))
            .first();

        if (!authUser) {
            return { error: "Auth user not found for admin@cingcing.id" };
        }

        // Check if profile exists
        const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", q => q.eq("userId", authUser._id))
            .first();

        // Check for Admin role
        const adminRole = await ctx.db
            .query("roles")
            .withIndex("by_name", q => q.eq("name", "Admin"))
            .first();

        return {
            authUser,
            profile,
            adminRole,
            missingProfile: !profile
        };
    },
});

export const fixAdminProfile = mutation({
    args: {
        userId: v.id("users"), // Auth user ID
        roleId: v.id("roles"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", q => q.eq("userId", args.userId))
            .first();

        if (existing) return { message: "Profile already exists", id: existing._id };

        const profileId = await ctx.db.insert("userProfiles", {
            userId: args.userId,
            name: "Admin User",
            email: "admin@cingcing.id",
            roleId: args.roleId,
            isActive: true,
            createdBy: "debug-script",
            updatedBy: "debug-script",
        });

        // Assign role
        await ctx.db.insert("userRoles", {
            userId: args.userId,
            roleId: args.roleId,
            assignedBy: "debug-script",
            assignedAt: Date.now(),
            isActive: true,
        });

        return { message: "Created profile", profileId };
    },
});
