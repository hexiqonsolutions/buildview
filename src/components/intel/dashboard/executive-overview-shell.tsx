"use client";

import type { ClientDashboardData } from "@/lib/actions/data";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { ExecutiveOverview } from "@/components/intel/dashboard/executive-overview";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface ExecutiveOverviewShellProps {
  firstName: string;
  data: ClientDashboardData;
}

export function ExecutiveOverviewShell({ firstName, data }: ExecutiveOverviewShellProps) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";

  return (
    <ExecutiveOverview
      firstName={firstName}
      data={data}
      workspaceQuery={workspaceQuery}
    />
  );
}
