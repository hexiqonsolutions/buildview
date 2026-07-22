"use client";

import type { ClientDashboardData } from "@/lib/actions/data";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { ExecutiveOverview } from "@/components/intel/dashboard/executive-overview";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface ExecutiveOverviewShellProps {
  firstName: string;
  data: ClientDashboardData;
}

export function ExecutiveOverviewShell({ firstName, data }: ExecutiveOverviewShellProps) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";

  return (
    <div className="space-y-6">
      <PortalWorkspaceContextStrip noun="Dashboard" />
      <ExecutiveOverview
        firstName={firstName}
        data={data}
        workspaceQuery={workspaceQuery}
      />
    </div>
  );
}
