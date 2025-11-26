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

      // 2. Check if there is a pre-created profile for this email (Pre-registration flow)
      const preCreatedProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (preCreatedProfile) {
        // If profile exists but has a pending userId (starts with "pending:"), claim it!
        if (preCreatedProfile.userId.startsWith("pending:")) {
          await ctx.db.patch(preCreatedProfile._id, {
            userId: userId,
            name: (args.profile.name as string) || preCreatedProfile.name, // Prefer auth name if available, else keep pre-set name
            updatedBy: userId,
          });

          // Also update any userRoles that were assigned to the pending ID
          const pendingRoles = await ctx.db
            .query("userRoles")
            .withIndex("by_user_id", (q) => q.eq("userId", preCreatedProfile.userId))
            .collect();

          for (const role of pendingRoles) {
            await ctx.db.patch(role._id, {
              userId: userId,
              isActive: true,
            });
          }
        }
        // If profile exists and has a real userId, it's a returning user, do nothing.
      } else {
        // 3. No pre-created profile. Check if this is the admin user (Bootstrap flow)
        if (email === "admin@petshop.com") {
          // Get Admin role
          const adminRole = await ctx.db
            .query("roles")
            .withIndex("by_name", (q) => q.eq("name", "Admin"))
            .first();

          if (adminRole) {
            // Create user profile with Admin role
            await ctx.db.insert("userProfiles", {
              userId: userId,
              email: email,
              name: "Super Admin",
              roleId: adminRole._id,
              isActive: true,
              createdBy: userId,
            });

            // Create user-role junction
            await ctx.db.insert("userRoles", {
              userId: userId,
              roleId: adminRole._id,
              assignedAt: Date.now(),
              isActive: true,
              assignedBy: userId,
            });
          }
        } else {
          // 4. Regular new user signup (Self-registration)
          // Create a basic profile without role (or default role if you have one)
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
