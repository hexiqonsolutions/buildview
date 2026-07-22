import type { UserRole } from "@/lib/types";
import {
  BUILDVIEW_STAFF_ROLES,
  isBuildViewStaffRole,
  isClientPortalRole,
  normalizeClientRole,
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
  admin: {
    clients: STAFF_FULL,
    projects: STAFF_FULL,
    upload: STAFF_FULL,
    matterport: STAFF_FULL,
    reports: STAFF_FULL,
    documents: STAFF_FULL,
    issues: STAFF_FULL,
    invoices: STAFF_FULL,
    users: ["read", "update"],
    analytics: ["read"],
    storage: ["read"],
    notifications: STAFF_FULL,
    activity: ["read"],
  },
  operations_manager: {
    clients: ["read", "update"],
    projects: STAFF_FULL,
    upload: STAFF_FULL,
    matterport: STAFF_FULL,
    reports: STAFF_FULL,
    documents: STAFF_FULL,
    issues: STAFF_FULL,
    invoices: ["read", "update"],
    users: ["read"],
    analytics: ["read"],
    storage: ["read"],
    notifications: STAFF_FULL,
    activity: ["read"],
  },
  site_engineer: {
    clients: ["read"],
    projects: ["read"],
    upload: STAFF_READ_UPLOAD,
    matterport: STAFF_READ_UPLOAD,
    reports: STAFF_READ_UPLOAD,
    documents: STAFF_READ_UPLOAD,
    issues: STAFF_READ_UPLOAD,
    invoices: ["read"],
    notifications: ["read"],
    activity: ["read"],
  },
  client_admin: {
    projects: ["read"],
    matterport: ["read"],
    reports: ["read"],
    documents: ["read"],
    issues: ["read"],
    invoices: ["read"],
    users: ["read", "update"],
    notifications: ["read"],
  },
  client_user: {
    projects: ["read"],
    matterport: ["read"],
    reports: ["read"],
    documents: ["read"],
    issues: ["read"],
    invoices: ["read"],
    notifications: ["read"],
  },
  client: {
    projects: ["read"],
    matterport: ["read"],
    reports: ["read"],
    documents: ["read"],
    issues: ["read"],
    invoices: ["read"],
    notifications: ["read"],
  },
  read_only_client: {
    projects: ["read"],
    matterport: ["read"],
    reports: ["read"],
    documents: ["read"],
    issues: ["read"],
    invoices: ["read"],
  },
  consultant: {
    projects: ["read"],
    matterport: ["read"],
    reports: ["read"],
    documents: ["read"],
    issues: ["read"],
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
  const normalized = isClientPortalRole(role) ? normalizeClientRole(role) : role;
  const allowed = PERMISSIONS[normalized]?.[resource] ?? [];
  return allowed.includes(action);
}

export function canImpersonate(role: UserRole): boolean {
  return can(role, "impersonate", "users");
}

export function staffRoles(): UserRole[] {
  return [...BUILDVIEW_STAFF_ROLES];
}
