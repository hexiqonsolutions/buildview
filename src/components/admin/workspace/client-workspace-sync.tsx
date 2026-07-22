"use client";

import { useEffect } from "react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";

/** Syncs the global admin workspace when viewing a client or project page. */
export function ClientWorkspaceSync({
  clientId,
  projectId,
}: {
  clientId?: string;
  projectId?: string;
}) {
  const { setClientId, setProjectId, hydrated } = useAdminWorkspace();

  useEffect(() => {
    if (!hydrated) return;
    if (clientId) setClientId(clientId);
    if (projectId) setProjectId(projectId);
  }, [clientId, projectId, hydrated, setClientId, setProjectId]);

  return null;
}
