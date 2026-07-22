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
  "client_user",
  "read_only_client",
  "consultant",
] as const satisfies readonly UserRole[];

export type ClientPortalRole = (typeof CLIENT_PORTAL_ROLES)[number];

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

/** Legacy `client` maps to client_user for permission checks */
export function normalizeClientRole(role: UserRole): UserRole {
  return role === "client" ? "client_user" : role;
}
