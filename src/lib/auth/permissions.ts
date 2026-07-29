import type { UserRole } from "@/lib/types";
import {
  BUILDVIEW_STAFF_ROLES,
  canAssignRoles as canAssignRolesHelper,
  canCommentOnProject as canCommentOnProjectHelper,
  canManageClientUploads as canManageClientUploadsHelper,
  canUploadMatterport as canUploadMatterportHelper,
  isBuildViewStaffRole,
  isClientPortalRole,
} from "@/lib/auth/roles";

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "upload"
  | "approve"
  | "impersonate"
  | "manage_users"
  | "manage_settings";

export type PermissionResource =
  | "clients"
  | "projects"
  | "upload"
  | "matterport"
  | "reports"
  | "documents"
  | "issues"
  | "invoices"
  | "users"
  | "settings"
  | "analytics"
  | "storage"
  | "notifications"
  | "activity";

type RolePermissions = Partial<Record<PermissionResource, PermissionAction[]>>;

const STAFF_FULL: PermissionAction[] = [
  "create",
  "read",
  "update",
  "delete",
  "upload",
  "approve",
];

const STAFF_READ_UPLOAD: PermissionAction[] = ["read", "upload", "update"];

const CLIENT_UPLOAD_ACTIONS: PermissionAction[] = [
  "create",
  "read",
  "update",
  "upload",
];

const CLIENT_VIEW: PermissionAction[] = ["read"];

/** Shared ops matrix for Admin + Operations Manager (full dashboard control). */
const ADMIN_OPS_MATRIX: RolePermissions = {
  clients: STAFF_FULL,
  projects: STAFF_FULL,
  upload: STAFF_FULL,
  matterport: STAFF_FULL,
  reports: STAFF_FULL,
  documents: STAFF_FULL,
  issues: STAFF_FULL,
  invoices: STAFF_FULL,
  users: ["read"],
  analytics: STAFF_FULL,
  storage: STAFF_FULL,
  notifications: STAFF_FULL,
  activity: STAFF_FULL,
};

/** Client Admin / Site Supervisor — upload & manage project content (not Matterport). */
const CLIENT_MANAGER_MATRIX: RolePermissions = {
  projects: ["read", "update"],
  upload: CLIENT_UPLOAD_ACTIONS,
  matterport: CLIENT_VIEW,
  reports: CLIENT_UPLOAD_ACTIONS,
  documents: CLIENT_UPLOAD_ACTIONS,
  issues: CLIENT_UPLOAD_ACTIONS,
  invoices: CLIENT_VIEW,
  notifications: CLIENT_VIEW,
};

/** App-layer permission matrix (UI + server action guards) */
const PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    clients: STAFF_FULL,
    projects: STAFF_FULL,
    upload: STAFF_FULL,
    matterport: STAFF_FULL,
    reports: STAFF_FULL,
    documents: STAFF_FULL,
    issues: STAFF_FULL,
    invoices: STAFF_FULL,
    users: [...STAFF_FULL, "impersonate"],
    settings: STAFF_FULL,
    analytics: STAFF_FULL,
    storage: STAFF_FULL,
    notifications: STAFF_FULL,
    activity: STAFF_FULL,
  },
  admin: { ...ADMIN_OPS_MATRIX },
  operations_manager: {
    ...ADMIN_OPS_MATRIX,
    matterport: ["read", "update", "delete"],
  },
  site_engineer: {
    clients: ["read"],
    projects: ["read"],
    upload: STAFF_READ_UPLOAD,
    matterport: CLIENT_VIEW,
    reports: STAFF_READ_UPLOAD,
    documents: STAFF_READ_UPLOAD,
    issues: STAFF_READ_UPLOAD,
    invoices: ["read"],
    notifications: ["read"],
    activity: ["read"],
  },
  client_admin: {
    ...CLIENT_MANAGER_MATRIX,
    users: ["read", "update"],
  },
  site_supervisor: {
    ...CLIENT_MANAGER_MATRIX,
  },
  /** Client: view + update project status/issues + comments (no upload). */
  client: {
    projects: ["read", "update"],
    matterport: CLIENT_VIEW,
    reports: CLIENT_VIEW,
    documents: CLIENT_VIEW,
    issues: ["read", "update"],
    invoices: CLIENT_VIEW,
    notifications: CLIENT_VIEW,
  },
  /** Client User: view + comments only. */
  client_user: {
    projects: CLIENT_VIEW,
    matterport: CLIENT_VIEW,
    reports: CLIENT_VIEW,
    documents: CLIENT_VIEW,
    issues: CLIENT_VIEW,
    invoices: CLIENT_VIEW,
    notifications: CLIENT_VIEW,
  },
  read_only_client: {
    projects: CLIENT_VIEW,
    matterport: CLIENT_VIEW,
    reports: CLIENT_VIEW,
    documents: CLIENT_VIEW,
    issues: CLIENT_VIEW,
    invoices: CLIENT_VIEW,
  },
  consultant: {
    projects: CLIENT_VIEW,
    matterport: CLIENT_VIEW,
    reports: CLIENT_VIEW,
    documents: CLIENT_VIEW,
    issues: CLIENT_VIEW,
  },
};

export function canAccessAdmin(role: UserRole): boolean {
  return isBuildViewStaffRole(role);
}

export function canAccessClientPortal(role: UserRole): boolean {
  return isClientPortalRole(role) || role === "super_admin";
}

export function can(
  role: UserRole,
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  const allowed = PERMISSIONS[role]?.[resource] ?? [];
  return allowed.includes(action);
}

export function canImpersonate(role: UserRole): boolean {
  return can(role, "impersonate", "users");
}

export function canManageClientUploads(role: UserRole): boolean {
  return canManageClientUploadsHelper(role);
}

export function canUploadMatterport(role: UserRole): boolean {
  return canUploadMatterportHelper(role);
}

export function canAssignRoles(role: UserRole): boolean {
  return canAssignRolesHelper(role);
}

export function canCommentOnProject(role: UserRole): boolean {
  return canCommentOnProjectHelper(role);
}

export function staffRoles(): UserRole[] {
  return [...BUILDVIEW_STAFF_ROLES];
}
