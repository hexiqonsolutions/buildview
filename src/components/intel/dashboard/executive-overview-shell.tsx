"use client";

import type { ClientDashboardData } from "@/lib/actions/data";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { ExecutiveOverview } from "@/components/intel/dashboard/executive-overview";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface ExecutiveOverviewShellProps {
  firstName: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  data: ClientDashboardData;
}

export function ExecutiveOverviewShell({
  firstName,
  fullName,
  email,
  avatarUrl,
  data,
}: ExecutiveOverviewShellProps) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";

  return (
    <ExecutiveOverview
      firstName={firstName}
      fullName={fullName}
      email={email}
      avatarUrl={avatarUrl}
      data={data}
      workspaceQuery={workspaceQuery}
    />
  );
}
