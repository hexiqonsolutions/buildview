import { scopeToQueryString } from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";

const ADMIN_NO_WORKSPACE_EXACT = new Set([
  "/admin/clients",
  "/admin/projects",
  "/admin/users",
  "/admin/analytics",
  "/admin/storage",
  "/admin/notifications",
  "/admin/activity",
  "/admin/settings",
]);

/** Routes that should keep the active admin workspace in the URL. */
export function adminHrefShouldCarryWorkspace(href: string): boolean {
  const path = href.split("?")[0] ?? href;

  if (ADMIN_NO_WORKSPACE_EXACT.has(path)) {
    return false;
  }

  if (path.startsWith("/admin/clients/") || path.startsWith("/admin/projects/")) {
    return false;
  }

  return true;
}

export function withAdminWorkspaceQuery(href: string, workspaceQuery: string): string {
  if (!workspaceQuery || !adminHrefShouldCarryWorkspace(href)) {
    return href;
  }

  if (href.includes("?")) {
    return `${href}&${workspaceQuery.slice(1)}`;
  }

  return `${href}${workspaceQuery}`;
}

export function adminWorkspaceQueryFromScope(
  hydrated: boolean,
  scope: WorkspaceScope
): string {
  return hydrated ? scopeToQueryString(scope) : "";
}
