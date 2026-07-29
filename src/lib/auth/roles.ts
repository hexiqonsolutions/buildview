import type { UserRole } from "@/lib/types";

// =============================================================================
// Role Groups
// =============================================================================

/**
 * BuildView internal team — full platform access.
 * super_admin  – unrestricted
 * admin        – full project & upload control
 * operations_manager – same as admin minus Matterport upload
 */
export const BUILDVIEW_STAFF_ROLES = [
  "super_admin",
  "admin",
  "operations_manager",
] as const satisfies readonly UserRole[];

export type BuildViewStaffRole = (typeof BUILDVIEW_STAFF_ROLES)[number];

/**
 * Client portal roles — project-scoped access.
 * client_admin     – upload + comment + view
 * site_supervisor  – upload + comment + view
 * site_engineer    – upload + comment + view (same tier as site_supervisor)
 * client           – comment + view (+ update issue/project status)
 * client_user      – comment + view only
 * read_only_client – view only (no comments)
 * consultant       – view only (no comments)
 */
export const CLIENT_PORTAL_ROLES = [
  "client_admin",
  "site_supervisor",
  "site_engineer",
  "client",
  "client_user",
  "read_only_client",
  "consultant",
] as const satisfies readonly UserRole[];

export type ClientPortalRole = (typeof CLIENT_PORTAL_ROLES)[number];

/** Client roles that can upload reports, documents, timeline, and site photos. */
export const CLIENT_UPLOAD_ROLES = [
  "client_admin",
  "site_supervisor",
  "site_engineer",
] as const satisfies readonly UserRole[];

export type ClientUploadRole = (typeof CLIENT_UPLOAD_ROLES)[number];

/** Client roles that can leave comments on projects, reports, and documents. */
export const CLIENT_COMMENT_ROLES = [
  "client_admin",
  "site_supervisor",
  "site_engineer",
  "client",
  "client_user",
] as const satisfies readonly UserRole[];

export type ClientCommentRole = (typeof CLIENT_COMMENT_ROLES)[number];

export const ALL_USER_ROLES: UserRole[] = [
  ...BUILDVIEW_STAFF_ROLES,
  ...CLIENT_PORTAL_ROLES,
];

// =============================================================================
// Role Checks
// =============================================================================

export function isBuildViewStaffRole(role: UserRole): role is BuildViewStaffRole {
  return (BUILDVIEW_STAFF_ROLES as readonly string[]).includes(role);
}

export function isClientPortalRole(role: UserRole): role is ClientPortalRole {
  return (CLIENT_PORTAL_ROLES as readonly string[]).includes(role);
}

export function canManageClientUploads(role: UserRole): boolean {
  return (CLIENT_UPLOAD_ROLES as readonly string[]).includes(role);
}

/** Only BuildView Super Admin and Admin may add Matterport tour links. */
export function canUploadMatterport(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canAssignRoles(role: UserRole): boolean {
  return role === "super_admin";
}

/** Roles that can leave project / report / document comments. */
export function canCommentOnProject(role: UserRole): boolean {
  if (isBuildViewStaffRole(role)) return true;
  return (CLIENT_COMMENT_ROLES as readonly string[]).includes(role);
}

export function normalizeClientRole(role: UserRole): UserRole {
  return role;
}
