"use client";

import type { ClientDashboardData } from "@/lib/data/dashboard";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { ExecutiveOverview } from "@/components/intel/dashboard/executive-overview";
import { ConstructionIntelligenceOverview } from "@/components/intel/dashboard/construction-intelligence-overview";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface ExecutiveOverviewShellProps {
  firstName: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  data: ClientDashboardData;
  canUpdateStatus?: boolean;
  /** Staff home uses the original overview; construction clients get the Intelligence layout. */
  variant?: "original" | "construction";
}

export function ExecutiveOverviewShell({
  firstName,
  fullName,
  email,
  avatarUrl,
  data,
  canUpdateStatus = false,
  variant = "construction",
}: ExecutiveOverviewShellProps) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";

  const shared = {
    firstName,
    fullName,
    email,
    avatarUrl,
    data,
    workspaceQuery,
    canUpdateStatus,
  };

  if (variant === "original") {
    return <ExecutiveOverview {...shared} />;
  }

  return <ConstructionIntelligenceOverview {...shared} />;
}
