import type { UserRole } from "@/lib/types";

// =============================================================================
// Role Groups
// =============================================================================

/**
 * BuildView internal team — full platform access.
 * super_admin  – unrestricted
 * admin        – full project & upload control
 * operations_manager – same as admin minus virtual tour upload
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
 * client           – comment + view + report issues
 * client_user      – comment + view + report issues
 * read_only_client – view + report issues
 * consultant       – view + report issues
 *
 * Issue status changes: client_admin, site_supervisor, site_engineer only.
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

/**
 * Any client portal role assigned to a project may report issues.
 * Status changes are restricted separately (see CLIENT_ISSUE_STATUS_ROLES).
 */
export const CLIENT_ISSUE_CREATE_ROLES = [
  ...CLIENT_PORTAL_ROLES,
] as const satisfies readonly UserRole[];

export type ClientIssueCreateRole = (typeof CLIENT_ISSUE_CREATE_ROLES)[number];

/** Roles that may change issue status (open → in progress → resolved/closed). */
export const CLIENT_ISSUE_STATUS_ROLES = [
  "client_admin",
  "site_supervisor",
  "site_engineer",
] as const satisfies readonly UserRole[];

export type ClientIssueStatusRole = (typeof CLIENT_ISSUE_STATUS_ROLES)[number];

/** Only Client Admin sees invoices in the client portal (billing is org-admin scoped). */
export const CLIENT_INVOICE_VIEW_ROLES = ["client_admin"] as const satisfies readonly UserRole[];

export type ClientInvoiceViewRole = (typeof CLIENT_INVOICE_VIEW_ROLES)[number];

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

/** Only BuildView Super Admin and Admin may add virtual tour links. */
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

/** Any project-connected client role (and BuildView staff) may report an issue. */
export function canCreateProjectIssue(role: UserRole): boolean {
  if (isBuildViewStaffRole(role)) return true;
  return (CLIENT_ISSUE_CREATE_ROLES as readonly string[]).includes(role);
}

/** Client Admin, Site Supervisor, Site Engineer (and staff) may change issue status. */
export function canUpdateIssueStatus(role: UserRole): boolean {
  if (isBuildViewStaffRole(role)) return true;
  return (CLIENT_ISSUE_STATUS_ROLES as readonly string[]).includes(role);
}

/** Client Admin (and BuildView staff) may view invoices in the portal. */
export function canViewClientInvoices(role: UserRole): boolean {
  if (isBuildViewStaffRole(role)) return true;
  return (CLIENT_INVOICE_VIEW_ROLES as readonly string[]).includes(role);
}

export function normalizeClientRole(role: UserRole): UserRole {
  return role;
}
