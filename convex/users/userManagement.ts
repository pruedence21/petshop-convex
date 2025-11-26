/**
 * User Management API
 * 
 * This module provides admin-only functions for managing users:
 * - Creating new users
 * - Listing users
 * - Updating user profiles
 * - Assigning roles
 * - Activating/deactivating users
 * - Resetting passwords
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  requireAdmin,
  requirePermission,
  requireUserProfile,
  getCurrentUserProfile,
} from "./authHelpers";
import { PERMISSIONS } from "./roles";

/**
 * Create a new user (admin only)
 * Creates both auth account and user profile
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    roleId: v.optional(v.id("roles")),
  },
  returns: v.object({
    profileId: v.id("userProfiles"),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Require admin permission
    const currentUser = await requirePermission(ctx, PERMISSIONS.USERS_CREATE);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Check if email already exists in userProfiles
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      throw new Error("User with this email already exists");
    }

    // Validate branch if provided
    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId);
      if (!branch || !branch.isActive) {
        throw new Error("Invalid or inactive branch");
      }
    }

    // Validate role if provided
    if (args.roleId) {
      const role = await ctx.db.get(args.roleId);
      if (!role || !role.isActive) {
        throw new Error("Invalid or inactive role");
      }
    }

    // Create a "pending" userId
    // This will be replaced by the real userId when they sign up
    const pendingUserId = `pending:${args.email}`;

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: pendingUserId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      branchId: args.branchId,
      roleId: args.roleId,
      isActive: true,
      createdBy: currentUser.userId,
      updatedBy: currentUser.userId,
    });

    // Create user-role junction if role is provided
    if (args.roleId) {
      await ctx.db.insert("userRoles", {
        userId: pendingUserId,
        roleId: args.roleId,
        assignedBy: currentUser.userId,
        assignedAt: Date.now(),
        isActive: true,
      });
    }

    return {
      profileId,
      message: "User profile created. User can now sign up with this email to claim the account.",
    };
  },
});

/**
 * Link an authenticated user to a profile (internal use after auth signup)
 */
export const linkUserProfile = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    roleId: v.optional(v.id("roles")),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      throw new Error("User profile already exists");
    }

    // Create user profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      branchId: args.branchId,
      roleId: args.roleId,
      isActive: true,
      createdBy: args.createdBy,
      updatedBy: args.createdBy,
    });

    // Create user-role junction if role is provided
    if (args.roleId) {
      await ctx.db.insert("userRoles", {
        userId: args.userId,
        roleId: args.roleId,
        assignedBy: args.createdBy,
        assignedAt: Date.now(),
        isActive: true,
      });
    }

    return profileId;
  },
});

/**
 * List all users (admin only)
 */
export const listUsers = query({
  args: {
    branchId: v.optional(v.id("branches")),
    roleId: v.optional(v.id("roles")),
    isActive: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      branchId: v.optional(v.id("branches")),
      roleId: v.optional(v.id("roles")),
      isActive: v.boolean(),
      lastLoginAt: v.optional(v.number()),
      branchName: v.optional(v.string()),
      roleName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Attempt bootstrap detection before enforcing permissions.
    // If no profile exists AND there are zero profiles total, return empty array so the UI can show onboarding.
    const current = await getCurrentUserProfile(ctx);
    if (!current) {
      const anyProfile = await ctx.db.query("userProfiles").take(1);
      if (anyProfile.length === 0) {
        return [];
      }
    }
    // Require permission to view users (will throw if profile missing in non-bootstrap state)
    await requirePermission(ctx, PERMISSIONS.USERS_READ);

    // Get all user profiles
    let profiles = await ctx.db.query("userProfiles").collect();

    // Filter by branch
    if (args.branchId !== undefined) {
      profiles = profiles.filter((p) => p.branchId === args.branchId);
    }

    // Filter by role
    if (args.roleId !== undefined) {
      profiles = profiles.filter((p) => p.roleId === args.roleId);
    }

    // Filter by active status
    if (args.isActive !== undefined) {
      profiles = profiles.filter((p) => p.isActive === args.isActive);
    }

    // Filter by search query (name or email)
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query)
      );
    }

    // Enrich with branch and role names
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        let branchName: string | undefined;
        let roleName: string | undefined;

        if (profile.branchId) {
          const branch = await ctx.db.get(profile.branchId);
          branchName = branch?.name;
        }

        if (profile.roleId) {
          const role = await ctx.db.get(profile.roleId);
          roleName = role?.name;
        }

        return {
          _id: profile._id,
          _creationTime: profile._creationTime,
          userId: profile.userId,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          branchId: profile.branchId,
          roleId: profile.roleId,
          isActive: profile.isActive,
          lastLoginAt: profile.lastLoginAt,
          branchName,
          roleName,
        };
      })
    );

    return enrichedProfiles;
  },
});

/**
 * Get user details by profile ID (admin only)
 */
export const getUserDetails = query({
  args: {
    profileId: v.id("userProfiles"),
  },
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      branchId: v.optional(v.id("branches")),
      roleId: v.optional(v.id("roles")),
      isActive: v.boolean(),
      lastLoginAt: v.optional(v.number()),
      createdBy: v.optional(v.string()),
      updatedBy: v.optional(v.string()),
      deletedAt: v.optional(v.number()),
      branch: v.optional(
        v.object({
          _id: v.id("branches"),
          name: v.string(),
          code: v.string(),
        })
      ),
      role: v.optional(
        v.object({
          _id: v.id("roles"),
          name: v.string(),
          permissions: v.array(v.string()),
        })
      ),
      assignedRoles: v.array(
        v.object({
          _id: v.id("userRoles"),
          roleId: v.id("roles"),
          roleName: v.string(),
          assignedAt: v.number(),
          isActive: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Require permission to view users
    await requirePermission(ctx, PERMISSIONS.USERS_READ);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      return null;
    }

    // Get branch details
    let branch;
    if (profile.branchId) {
      const branchDoc = await ctx.db.get(profile.branchId);
      if (branchDoc) {
        branch = {
          _id: branchDoc._id,
          name: branchDoc.name,
          code: branchDoc.code,
        };
      }
    }

    // Get role details
    let role;
    if (profile.roleId) {
      const roleDoc = await ctx.db.get(profile.roleId);
      if (roleDoc) {
        role = {
          _id: roleDoc._id,
          name: roleDoc.name,
          permissions: roleDoc.permissions,
        };
      }
    }

    // Get all assigned roles
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user_id", (q) => q.eq("userId", profile.userId))
      .collect();

    const assignedRoles = await Promise.all(
      userRoles.map(async (ur) => {
        const roleDoc = await ctx.db.get(ur.roleId);
        return {
          _id: ur._id,
          roleId: ur.roleId,
          roleName: roleDoc?.name || "Unknown",
          assignedAt: ur.assignedAt,
          isActive: ur.isActive,
        };
      })
    );

    return {
      ...profile,
      branch,
      role,
      assignedRoles,
    };
  },
});

/**
 * Update user profile (admin only)
 */
export const updateUser = mutation({
  args: {
    profileId: v.id("userProfiles"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
    roleId: v.optional(v.id("roles")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Require permission to update users
    const currentUser = await requirePermission(ctx, PERMISSIONS.USERS_UPDATE);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("User profile not found");
    }

    // Validate branch if provided
    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId);
      if (!branch || !branch.isActive) {
        throw new Error("Invalid or inactive branch");
      }
    }

    // Validate role if provided
    if (args.roleId) {
      const role = await ctx.db.get(args.roleId);
      if (!role || !role.isActive) {
        throw new Error("Invalid or inactive role");
      }
    }

    // Update profile
    await ctx.db.patch(args.profileId, {
      ...(args.name && { name: args.name }),
      ...(args.phone !== undefined && { phone: args.phone }),
      ...(args.branchId !== undefined && { branchId: args.branchId }),
      ...(args.roleId !== undefined && { roleId: args.roleId }),
      updatedBy: currentUser.userId,
    });

    // Update user-role junction if role changed
    if (args.roleId) {
      // Deactivate old roles
      const oldUserRoles = await ctx.db
        .query("userRoles")
        .withIndex("by_user_id", (q) => q.eq("userId", profile.userId))
        .collect();

      for (const ur of oldUserRoles) {
        await ctx.db.patch(ur._id, { isActive: false });
      }

      // Check if this role assignment already exists
      const existingAssignment = await ctx.db
        .query("userRoles")
        .withIndex("by_user_and_role", (q) =>
          q.eq("userId", profile.userId).eq("roleId", args.roleId!)
        )
        .first();

      if (existingAssignment) {
        // Reactivate existing assignment
        await ctx.db.patch(existingAssignment._id, { isActive: true });
      } else {
        // Create new assignment
        await ctx.db.insert("userRoles", {
          userId: profile.userId,
          roleId: args.roleId,
          assignedBy: currentUser.userId,
          assignedAt: Date.now(),
          isActive: true,
        });
      }
    }

    return null;
  },
});

/**
 * Deactivate/activate user (admin only)
 */
export const toggleUserStatus = mutation({
  args: {
    profileId: v.id("userProfiles"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Require permission to update users
    const currentUser = await requirePermission(ctx, PERMISSIONS.USERS_UPDATE);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("User profile not found");
    }

    // Prevent self-deactivation
    if (profile.userId === currentUser.userId && !args.isActive) {
      throw new Error("You cannot deactivate your own account");
    }

    await ctx.db.patch(args.profileId, {
      isActive: args.isActive,
      updatedBy: currentUser.userId,
    });

    return null;
  },
});

/**
 * Delete user permanently (admin only)
 */
export const deleteUser = mutation({
  args: {
    profileId: v.id("userProfiles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Require permission to delete users
    const currentUser = await requirePermission(ctx, PERMISSIONS.USERS_DELETE);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("User profile not found");
    }

    // Prevent self-deletion
    if (profile.userId === currentUser.userId) {
      throw new Error("You cannot delete your own account");
    }

    // Soft delete (set deletedAt timestamp)
    await ctx.db.patch(args.profileId, {
      deletedAt: Date.now(),
      isActive: false,
      updatedBy: currentUser.userId,
    });

    // Deactivate all role assignments
    const userRoles = await ctx.db
      .query("userRoles")
      .withIndex("by_user_id", (q) => q.eq("userId", profile.userId))
      .collect();

    for (const ur of userRoles) {
      await ctx.db.patch(ur._id, { isActive: false });
    }

    return null;
  },
});

/**
 * Get current user's own profile
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.optional(v.string()),
      profile: v.object({
        _id: v.id("userProfiles"),
        userId: v.string(),
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        branchId: v.optional(v.id("branches")),
        roleId: v.optional(v.id("roles")),
        isActive: v.boolean(),
        lastLoginAt: v.optional(v.number()),
      }),
      role: v.union(
        v.object({
          _id: v.id("roles"),
          name: v.string(),
          permissions: v.array(v.string()),
        }),
        v.null()
      ),
      permissions: v.array(v.string()),
      branch: v.union(
        v.object({
          _id: v.id("branches"),
          name: v.string(),
          code: v.string(),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userProfile = await getCurrentUserProfile(ctx);
    if (!userProfile) {
      return null;
    }

    // Get branch details
    let branch = null;
    if (userProfile.profile.branchId) {
      const branchDoc = await ctx.db.get(userProfile.profile.branchId);
      if (branchDoc) {
        branch = {
          _id: branchDoc._id,
          name: branchDoc.name,
          code: branchDoc.code,
        };
      }
    }

    return {
      userId: userProfile.userId,
      email: userProfile.email,
      profile: userProfile.profile,
      role: userProfile.role,
      permissions: userProfile.permissions,
      branch,
    };
  },
});

/**
 * Update last login timestamp (internal use)
 */
export const updateLastLogin = internalMutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        lastLoginAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Self-registration for developers/admins (fixes "User profile not found")
 */
export const registerSelf = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (existingProfile) {
      return { message: "Profile already exists", profileId: existingProfile._id };
    }

    // Get Admin role
    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      throw new Error("Admin role not found. Please run 'node setup.mjs' first.");
    }

    // Create profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: identity.subject,
      name: identity.name || identity.email || "Admin User",
      email: identity.email || "admin@example.com",
      roleId: adminRole._id,
      isActive: true,
      createdBy: "self-registration",
      updatedBy: "self-registration",
    });

    // Create user-role junction
    await ctx.db.insert("userRoles", {
      userId: identity.subject,
      roleId: adminRole._id,
      assignedBy: "self-registration",
      assignedAt: Date.now(),
      isActive: true,
    });

    return { message: "Profile created successfully", profileId };
  },
});



