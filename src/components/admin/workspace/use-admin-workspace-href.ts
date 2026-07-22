"use client";

import { useMemo } from "react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import {
  adminWorkspaceQueryFromScope,
  withAdminWorkspaceQuery,
} from "@/lib/admin/nav";

/** Active admin workspace query string (`?client=…&project=…&buildingId=…`). */
export function useAdminWorkspaceQuery(): string {
  const { hydrated, scope } = useAdminWorkspace();
  return useMemo(
    () => adminWorkspaceQueryFromScope(hydrated, scope),
    [hydrated, scope]
  );
}

/** Append current workspace params to an admin href when appropriate. */
export function useAdminWorkspaceHref(href: string): string {
  const workspaceQuery = useAdminWorkspaceQuery();
  return useMemo(
    () => withAdminWorkspaceQuery(href, workspaceQuery),
    [href, workspaceQuery]
  );
}
