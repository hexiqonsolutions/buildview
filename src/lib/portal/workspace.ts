import type { Project } from "@/lib/types";
import type { AdminWorkspaceBootstrap } from "@/lib/admin/workspace";
import type { ClientDashboardType } from "@/lib/portal/dashboard-type";

export type PortalWorkspaceBootstrap = {
  clientId: string | null;
  /** Company display name for the signed-in portal client */
  clientName: string | null;
  clientLogoUrl: string | null;
  dashboardType: ClientDashboardType;
  projects: Project[];
  buildingsByProject: AdminWorkspaceBootstrap["buildingsByProject"];
  floorsByProject: AdminWorkspaceBootstrap["floorsByProject"];
  buildingIdsByProject: AdminWorkspaceBootstrap["buildingIdsByProject"];
  floorIdsByProject: AdminWorkspaceBootstrap["floorIdsByProject"];
};

export const PORTAL_WORKSPACE_STORAGE_KEY = "buildview-portal-workspace";

export function portalToAdminBootstrap(
  bootstrap: PortalWorkspaceBootstrap
): AdminWorkspaceBootstrap {
  return {
    clients: [],
    projects: bootstrap.projects,
    buildingsByProject: bootstrap.buildingsByProject,
    floorsByProject: bootstrap.floorsByProject,
    buildingIdsByProject: bootstrap.buildingIdsByProject,
    floorIdsByProject: bootstrap.floorIdsByProject,
  };
}
