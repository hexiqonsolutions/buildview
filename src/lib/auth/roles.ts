import type { UserRole } from "@/lib/types";

/** BuildView internal team — Operations Control Center */
export const BUILDVIEW_STAFF_ROLES = [
  "super_admin",
  "admin",
  "operations_manager",
  "site_engineer",
] as const satisfies readonly UserRole[];

export type BuildViewStaffRole = (typeof BUILDVIEW_STAFF_ROLES)[number];

/** Client portal roles */
export const CLIENT_PORTAL_ROLES = [
  "client",
  "client_admin",
  "site_supervisor",
  "client_user",
  "read_only_client",
  "consultant",
] as const satisfies readonly UserRole[];

export type ClientPortalRole = (typeof CLIENT_PORTAL_ROLES)[number];

/** Client roles that can upload project content (tours, docs, reports, etc.) */
export const CLIENT_UPLOAD_ROLES = [
  "client_admin",
  "site_supervisor",
] as const satisfies readonly UserRole[];

export type ClientUploadRole = (typeof CLIENT_UPLOAD_ROLES)[number];

export const ALL_USER_ROLES: UserRole[] = [
  ...BUILDVIEW_STAFF_ROLES,
  ...CLIENT_PORTAL_ROLES,
];

export function isBuildViewStaffRole(role: UserRole): role is BuildViewStaffRole {
  return (BUILDVIEW_STAFF_ROLES as readonly string[]).includes(role);
}

export function isClientPortalRole(role: UserRole): role is ClientPortalRole {
  return (CLIENT_PORTAL_ROLES as readonly string[]).includes(role);
}

export function canManageClientUploads(role: UserRole): boolean {
  return (CLIENT_UPLOAD_ROLES as readonly string[]).includes(role);
}

export function canAssignRoles(role: UserRole): boolean {
  return role === "super_admin";
}

/** Roles that can leave project / report / document comments */
export function canCommentOnProject(role: UserRole): boolean {
  return isClientPortalRole(role) || isBuildViewStaffRole(role);
}

/**
 * Identity helper — do not collapse `client` into `client_user`.
 * Those roles have different permissions (Client can update status/issues).
 */
export function normalizeClientRole(role: UserRole): UserRole {
  return role;
}
