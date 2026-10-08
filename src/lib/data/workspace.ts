import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import type { Client, ClientDashboardType } from "@/lib/types";
import type { AdminWorkspaceBootstrap } from "@/lib/admin/workspace";
import { parseTourWorkspaceMeta } from "@/lib/admin/tour-metadata";
import type { PortalWorkspaceBootstrap } from "@/lib/portal/workspace";
import { resolveClientDashboardType } from "@/lib/portal/dashboard-type";
import { getCurrentUser } from "@/lib/actions/auth";
import { requireStaffPermission } from "@/lib/auth/staff";
import { getProjects } from "@/lib/data/projects";

export const getAdminWorkspaceBootstrap = cache(async (): Promise<AdminWorkspaceBootstrap> => {
  await requireStaffPermission("read", "projects");
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: tours }, { data: dbBuildings }, { data: dbFloors }] =
    await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company_name, logo_url, email, phone, is_active")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("projects").select("*").is("deleted_at", null).order("name"),
    supabase
      .from("project_tours")
      .select("project_id, description, building_id, floor_id")
      .is("deleted_at", null),
    supabase
      .from("buildings")
      .select("id, project_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("floors")
      .select("id, building_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  const buildingsByProject: Record<string, string[]> = {};
  const floorsByProject: Record<string, Record<string, string[]>> = {};
  const buildingIdsByProject: Record<string, Record<string, string>> = {};
  const floorIdsByProject: Record<string, Record<string, Record<string, string>>> = {};

  dbBuildings?.forEach((b) => {
    const set = new Set(buildingsByProject[b.project_id] ?? []);
    set.add(b.name);
    buildingsByProject[b.project_id] = Array.from(set).sort();
    if (!buildingIdsByProject[b.project_id]) buildingIdsByProject[b.project_id] = {};
    buildingIdsByProject[b.project_id][b.name] = b.id;
  });

  dbFloors?.forEach((f) => {
    const buildingRow = dbBuildings?.find((b) => b.id === f.building_id);
    const projectId = buildingRow?.project_id;
    const buildingName = buildingRow?.name;
    if (!projectId || !buildingName) return;
    if (!floorsByProject[projectId]) floorsByProject[projectId] = {};
    const floorSet = new Set(floorsByProject[projectId][buildingName] ?? []);
    floorSet.add(f.name);
    floorsByProject[projectId][buildingName] = Array.from(floorSet).sort();
    if (!floorIdsByProject[projectId]) floorIdsByProject[projectId] = {};
    if (!floorIdsByProject[projectId][buildingName]) {
      floorIdsByProject[projectId][buildingName] = {};
    }
    floorIdsByProject[projectId][buildingName][f.name] = f.id;
  });

  tours?.forEach((tour) => {
    const meta = parseTourWorkspaceMeta(tour.description);
    const pid = tour.project_id;
    if (!pid) return;

    const buildingName = meta.building;
    const buildingId = tour.building_id ?? meta.building_id ?? null;
    const floorName = meta.floor;
    const floorId = tour.floor_id ?? meta.floor_id ?? null;

    if (buildingName) {
      const set = new Set(buildingsByProject[pid] ?? []);
      set.add(buildingName);
      buildingsByProject[pid] = Array.from(set).sort();
      if (buildingId) {
        if (!buildingIdsByProject[pid]) buildingIdsByProject[pid] = {};
        buildingIdsByProject[pid][buildingName] = buildingId;
      }
    }

    if (buildingName && floorName) {
      if (!floorsByProject[pid]) floorsByProject[pid] = {};
      const floorSet = new Set(floorsByProject[pid][buildingName] ?? []);
      floorSet.add(floorName);
      floorsByProject[pid][buildingName] = Array.from(floorSet).sort();
      if (floorId) {
        if (!floorIdsByProject[pid]) floorIdsByProject[pid] = {};
        if (!floorIdsByProject[pid][buildingName]) {
          floorIdsByProject[pid][buildingName] = {};
        }
        floorIdsByProject[pid][buildingName][floorName] = floorId;
      }
    }
  });

  return {
    clients: clients ?? [],
    projects: projects ?? [],
    buildingsByProject,
    floorsByProject,
    buildingIdsByProject,
    floorIdsByProject,
  };
});

export const getPortalWorkspaceBootstrap = cache(async (): Promise<PortalWorkspaceBootstrap> => {
  const [user, projects] = await Promise.all([getCurrentUser(), getProjects()]);
  const projectIds = new Set(projects.map((p) => p.id));

  const supabase = await createClient();
  let clientName: string | null = null;
  let clientLogoUrl: string | null = null;
  let clientDashboardType: ClientDashboardType = "construction";

  // Prefer linked org; otherwise if this account only belongs to one client via projects, use that.
  let clientId = user?.client_id ?? null;
  if (!clientId) {
    const uniqueClientIds = Array.from(
      new Set(projects.map((p) => p.client_id).filter(Boolean) as string[])
    );
    if (uniqueClientIds.length === 1) {
      clientId = uniqueClientIds[0] ?? null;
    }
  }

  type ClientPortalFields = Pick<
    Client,
    "name" | "company_name" | "logo_url" | "dashboard_type"
  >;
  let clientRow: ClientPortalFields | null = null;

  if (clientId) {
    // Service role avoids RLS/schema-cache edge cases when reading dashboard_type.
    try {
      const admin = createServiceRoleClient();
      const { data } = await admin
        .from("clients")
        .select("name, company_name, logo_url, dashboard_type")
        .eq("id", clientId)
        .is("deleted_at", null)
        .maybeSingle();
      clientRow = (data as ClientPortalFields | null) ?? null;
    } catch {
      const { data } = await supabase
        .from("clients")
        .select("name, company_name, logo_url, dashboard_type")
        .eq("id", clientId)
        .is("deleted_at", null)
        .maybeSingle();
      clientRow = (data as ClientPortalFields | null) ?? null;
    }

    clientName = clientRow?.company_name?.trim() || clientRow?.name?.trim() || null;
    clientLogoUrl = clientRow?.logo_url?.trim() || null;
  }

  clientDashboardType = resolveClientDashboardType(user, clientRow);

  // Last resort: if any accessible project's client is portfolio, prefer that
  // when the signed-in user is a portal client (not staff browsing all projects).
  if (
    clientDashboardType === "construction" &&
    user &&
    !isBuildViewStaffRole(user.role) &&
    projects.length > 0
  ) {
    const projectClientIds = Array.from(
      new Set(projects.map((p) => p.client_id).filter(Boolean) as string[])
    );
    if (projectClientIds.length > 0) {
      try {
        const admin = createServiceRoleClient();
        const { data: projectClients } = await admin
          .from("clients")
          .select("id, dashboard_type")
          .in("id", projectClientIds)
          .is("deleted_at", null);
        const portfolioClient = projectClients?.find((c) => c.dashboard_type === "portfolio");
        if (portfolioClient) {
          clientDashboardType = "portfolio";
          if (!clientId) clientId = portfolioClient.id;
        }
      } catch {
        // ignore — keep construction
      }
    }
  }

  if (!clientName) {
    const fromProject = projects.find((p) => p.client_name?.trim())?.client_name?.trim();
    clientName = fromProject || null;
  }

  if (projectIds.size === 0) {
    return {
      clientId,
      clientName,
      clientLogoUrl,
      dashboardType: clientDashboardType,
      projects: [],
      buildingsByProject: {},
      floorsByProject: {},
      buildingIdsByProject: {},
      floorIdsByProject: {},
    };
  }

  const ids = Array.from(projectIds);

  const [{ data: tours }, { data: dbBuildings }, { data: dbFloors }] = await Promise.all([
    supabase
      .from("project_tours")
      .select("project_id, description, building_id, floor_id")
      .in("project_id", ids)
      .is("deleted_at", null),
    supabase
      .from("buildings")
      .select("id, project_id, name")
      .in("project_id", ids)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("floors")
      .select("id, building_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  const buildingsByProject: PortalWorkspaceBootstrap["buildingsByProject"] = {};
  const floorsByProject: PortalWorkspaceBootstrap["floorsByProject"] = {};
  const buildingIdsByProject: PortalWorkspaceBootstrap["buildingIdsByProject"] = {};
  const floorIdsByProject: PortalWorkspaceBootstrap["floorIdsByProject"] = {};

  dbBuildings?.forEach((b) => {
    if (!projectIds.has(b.project_id)) return;
    const set = new Set(buildingsByProject[b.project_id] ?? []);
    set.add(b.name);
    buildingsByProject[b.project_id] = Array.from(set).sort();
    if (!buildingIdsByProject[b.project_id]) buildingIdsByProject[b.project_id] = {};
    buildingIdsByProject[b.project_id][b.name] = b.id;
  });

  dbFloors?.forEach((f) => {
    const buildingRow = dbBuildings?.find((b) => b.id === f.building_id);
    const projectId = buildingRow?.project_id;
    const buildingName = buildingRow?.name;
    if (!projectId || !buildingName || !projectIds.has(projectId)) return;
    if (!floorsByProject[projectId]) floorsByProject[projectId] = {};
    const floorSet = new Set(floorsByProject[projectId][buildingName] ?? []);
    floorSet.add(f.name);
    floorsByProject[projectId][buildingName] = Array.from(floorSet).sort();
    if (!floorIdsByProject[projectId]) floorIdsByProject[projectId] = {};
    if (!floorIdsByProject[projectId][buildingName]) {
      floorIdsByProject[projectId][buildingName] = {};
    }
    floorIdsByProject[projectId][buildingName][f.name] = f.id;
  });

  tours?.forEach((tour) => {
    const meta = parseTourWorkspaceMeta(tour.description);
    const pid = tour.project_id;
    if (!pid || !projectIds.has(pid)) return;

    const buildingName = meta.building;
    const buildingId = tour.building_id ?? meta.building_id ?? null;
    const floorName = meta.floor;
    const floorId = tour.floor_id ?? meta.floor_id ?? null;

    if (buildingName) {
      const set = new Set(buildingsByProject[pid] ?? []);
      set.add(buildingName);
      buildingsByProject[pid] = Array.from(set).sort();
      if (buildingId) {
        if (!buildingIdsByProject[pid]) buildingIdsByProject[pid] = {};
        buildingIdsByProject[pid][buildingName] = buildingId;
      }
    }

    if (buildingName && floorName) {
      if (!floorsByProject[pid]) floorsByProject[pid] = {};
      const floorSet = new Set(floorsByProject[pid][buildingName] ?? []);
      floorSet.add(floorName);
      floorsByProject[pid][buildingName] = Array.from(floorSet).sort();
      if (floorId) {
        if (!floorIdsByProject[pid]) floorIdsByProject[pid] = {};
        if (!floorIdsByProject[pid][buildingName]) {
          floorIdsByProject[pid][buildingName] = {};
        }
        floorIdsByProject[pid][buildingName][floorName] = floorId;
      }
    }
  });

  return {
    clientId,
    clientName,
    clientLogoUrl,
    dashboardType: clientDashboardType,
    projects,
    buildingsByProject,
    floorsByProject,
    buildingIdsByProject,
    floorIdsByProject,
  };
});
