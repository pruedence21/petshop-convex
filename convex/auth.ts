import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    createOrUpdateUser: async (ctx: MutationCtx, args) => {
      // If user already exists (e.g. logging in with a different provider linked to same email), just return
      if (args.existingUserId) {
        return args.existingUserId;
      }

      const email = args.profile.email as string;

      // Check if user with this email already exists in users table (to avoid duplicates)
      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();

      let userId = existingUser?._id;

      if (!userId) {
        // 1. Create the user in the users table
        userId = await ctx.db.insert("users", {
          email: email,
          name: (args.profile.name as string) || email?.split("@")[0] || "User",
          emailVerificationTime: Date.now(),
        });
      }

      // 2. Check if this is the admin user
      if (email === "admin@petshop.com") {
        // Get Admin role
        const adminRole = await ctx.db
          .query("roles")
          .withIndex("by_name", (q) => q.eq("name", "Admin"))
          .first();

        if (adminRole) {
          // Check if profile already exists
          const existingProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .first();

          if (!existingProfile) {
            // Create user profile with Admin role
            await ctx.db.insert("userProfiles", {
              userId: userId,
              email: email,
              name: "Super Admin", // Default name for admin
              roleId: adminRole._id,
              isActive: true,
              createdBy: userId, // Self-created
            });
          } else {
            // Update existing profile to have Admin role
            await ctx.db.patch(existingProfile._id, {
              roleId: adminRole._id,
              name: existingProfile.name === "User" ? "Super Admin" : existingProfile.name,
            });
          }

          // Check if role assignment already exists
          const existingRole = await ctx.db
            .query("userRoles")
            .withIndex("by_user_and_role", (q) => q.eq("userId", userId).eq("roleId", adminRole._id))
            .first();

          if (!existingRole) {
            // Create user-role junction
            await ctx.db.insert("userRoles", {
              userId: userId,
              roleId: adminRole._id,
              assignedAt: Date.now(),
              isActive: true,
              assignedBy: userId,
            });
          }
        }
      } else {
        // For regular users, check if profile exists
        const existingProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .first();

        if (!existingProfile) {
          await ctx.db.insert("userProfiles", {
            userId: userId,
            email: email,
            name: (args.profile.name as string) || email?.split("@")[0] || "User",
            isActive: true,
            createdBy: userId,
          });
        }
      }

      return userId;
    },
  },
});
