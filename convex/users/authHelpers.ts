/**
 * Authentication and Authorization Helper Functions
 * 
 * This module provides utilities for:
 * - User authentication verification
 * - Role-based access control (RBAC)
 * - Permission checking
 * - User profile management
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Get the authenticated user's identity
 * Throws an error if the user is not authenticated
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Authentication required");
  }
  return identity;
}

/**
 * Get the current user's profile with role and permissions
 * Returns null if user is not authenticated or profile doesn't exist
 */
export async function getCurrentUserProfile(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Get user profile
  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .first();

  if (!userProfile) {
    return null;
  }

  // Get role if assigned
  let role: Doc<"roles"> | null = null;
  if (userProfile.roleId) {
    role = await ctx.db.get(userProfile.roleId);
  }

  return {
    userId: identity.subject,
    email: identity.email,
    profile: userProfile,
    role: role,
    permissions: role?.permissions || [],
  };
}

/**
 * Require authentication and return user profile
 * Throws an error if the user is not authenticated or profile doesn't exist
 */
export async function requireUserProfile(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);

  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .first();

  if (!userProfile) {
    // Bootstrap assistance: if there are zero profiles in the system, provide
    // specific onboarding instructions for creating the first (super admin) profile.
    // specific onboarding instructions for creating the first (super admin) profile.
    const anyExistingProfile = await ctx.db.query("userProfiles").take(1);
    if (anyExistingProfile.length === 0) {
      throw new Error(
        `Bootstrap required: No user profiles exist yet. Create the first super admin profile by calling internal.adminSeed.createSuperAdminProfile with { userId: "${identity.subject}", email: "<your_email>", name: "Super Administrator" }. See RBAC_SETUP_GUIDE.md.`
      );
    }
    console.log("DEBUG: User profile not found for identity:", JSON.stringify(identity, null, 2));
    throw new Error("User profile not found. Please contact administrator.");
  }

  if (!userProfile.isActive) {
    throw new Error("Your account has been deactivated. Please contact administrator.");
  }

  // Get role if assigned
  let role: Doc<"roles"> | null = null;
  if (userProfile.roleId) {
    role = await ctx.db.get(userProfile.roleId);
  }

  return {
    userId: identity.subject,
    email: identity.email ?? userProfile.email,
    profile: userProfile,
    role: role,
    permissions: role?.permissions || [],
  };
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  permission: string
): Promise<boolean> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (!userProfile) {
    return false;
  }

  // Check if user has the permission
  return userProfile.permissions.includes(permission);
}

/**
 * Require a specific permission
 * Throws an error if the user doesn't have the permission
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: string
) {
  const userProfile = await requireUserProfile(ctx);

  if (!userProfile.permissions.includes(permission)) {
    throw new Error(
      `Forbidden: You don't have permission to perform this action (${permission})`
    );
  }

  return userProfile;
}

/**
 * Require one of multiple permissions (OR logic)
 * Throws an error if the user doesn't have any of the permissions
 */
export async function requireAnyPermission(
  ctx: QueryCtx | MutationCtx,
  permissions: string[]
) {
  const userProfile = await requireUserProfile(ctx);

  const hasAny = permissions.some((permission) =>
    userProfile.permissions.includes(permission)
  );

  if (!hasAny) {
    throw new Error(
      `Forbidden: You don't have permission to perform this action. Required one of: ${permissions.join(", ")}`
    );
  }

  return userProfile;
}

/**
 * Require all of multiple permissions (AND logic)
 * Throws an error if the user doesn't have all of the permissions
 */
export async function requireAllPermissions(
  ctx: QueryCtx | MutationCtx,
  permissions: string[]
) {
  const userProfile = await requireUserProfile(ctx);

  const missingPermissions = permissions.filter(
    (permission) => !userProfile.permissions.includes(permission)
  );

  if (missingPermissions.length > 0) {
    throw new Error(
      `Forbidden: Missing required permissions: ${missingPermissions.join(", ")}`
    );
  }

  return userProfile;
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(
  ctx: QueryCtx | MutationCtx,
  roleName: string
): Promise<boolean> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (!userProfile || !userProfile.role) {
    return false;
  }

  return userProfile.role.name === roleName;
}

/**
 * Require a specific role
 * Throws an error if the user doesn't have the role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  roleName: string
) {
  const userProfile = await requireUserProfile(ctx);

  if (!userProfile.role || userProfile.role.name !== roleName) {
    throw new Error(`Forbidden: This action requires ${roleName} role`);
  }

  return userProfile;
}

/**
 * Require one of multiple roles (OR logic)
 * Throws an error if the user doesn't have any of the roles
 */
export async function requireAnyRole(
  ctx: QueryCtx | MutationCtx,
  roleNames: string[]
) {
  const userProfile = await requireUserProfile(ctx);

  if (!userProfile.role || !roleNames.includes(userProfile.role.name)) {
    throw new Error(
      `Forbidden: This action requires one of these roles: ${roleNames.join(", ")}`
    );
  }

  return userProfile;
}

/**
 * Check if the current user is an admin
 * Admin role has special privileges
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  return hasRole(ctx, "Admin");
}

/**
 * Require admin role
 * Throws an error if the user is not an admin
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, "Admin");
}

/**
 * Check if the current user belongs to a specific branch
 */
export async function isSameBranch(
  ctx: QueryCtx | MutationCtx,
  branchId: Id<"branches">
): Promise<boolean> {
  const userProfile = await getCurrentUserProfile(ctx);

  if (!userProfile) {
    return false;
  }

  return userProfile.profile.branchId === branchId;
}

/**
 * Require user to belong to a specific branch
 * Throws an error if the user doesn't belong to the branch
 */
export async function requireBranch(
  ctx: QueryCtx | MutationCtx,
  branchId: Id<"branches">
) {
  const userProfile = await requireUserProfile(ctx);

  if (userProfile.profile.branchId !== branchId) {
    throw new Error("Forbidden: You don't have access to this branch");
  }

  return userProfile;
}

/**
 * Get all permissions for a role by role ID
 */
export async function getRolePermissions(
  ctx: QueryCtx | MutationCtx,
  roleId: Id<"roles">
): Promise<string[]> {
  const role = await ctx.db.get(roleId);
  return role?.permissions || [];
}

/**
 * Check if a role has a specific permission
 */
export async function roleHasPermission(
  ctx: QueryCtx | MutationCtx,
  roleId: Id<"roles">,
  permission: string
): Promise<boolean> {
  const permissions = await getRolePermissions(ctx, roleId);
  return permissions.includes(permission);
}



