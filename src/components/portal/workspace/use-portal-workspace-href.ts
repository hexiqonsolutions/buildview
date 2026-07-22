"use client";

import { useMemo } from "react";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import {
  portalWorkspaceQueryFromScope,
  withPortalWorkspaceQuery,
} from "@/lib/portal/nav";

/** Active portal workspace query string (`?project=…&buildingId=…`). */
export function usePortalWorkspaceQuery(): string {
  const { hydrated, scope } = usePortalWorkspace();
  return useMemo(
    () => portalWorkspaceQueryFromScope(hydrated, scope),
    [hydrated, scope]
  );
}

/** Append current workspace params to a portal href when appropriate. */
export function usePortalWorkspaceHref(href: string): string {
  const workspaceQuery = usePortalWorkspaceQuery();
  return useMemo(
    () => withPortalWorkspaceQuery(href, workspaceQuery),
    [href, workspaceQuery]
  );
}
