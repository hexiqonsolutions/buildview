import { scopeToPortalQueryString } from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";

const NO_WORKSPACE_QUERY_PREFIXES = ["/dashboard/profile", "/admin"];

/** Routes that should keep the active portal workspace in the URL. */
export function portalHrefShouldCarryWorkspace(href: string): boolean {
  const path = href.split("?")[0] ?? href;
  return !NO_WORKSPACE_QUERY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function withPortalWorkspaceQuery(href: string, workspaceQuery: string): string {
  if (!workspaceQuery || !portalHrefShouldCarryWorkspace(href)) {
    return href;
  }

  if (href.includes("?")) {
    return `${href}&${workspaceQuery.slice(1)}`;
  }

  return `${href}${workspaceQuery}`;
}

export function portalWorkspaceQueryFromScope(
  hydrated: boolean,
  scope: WorkspaceScope
): string {
  return hydrated ? scopeToPortalQueryString(scope) : "";
}
