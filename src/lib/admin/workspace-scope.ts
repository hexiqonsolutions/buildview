import type { AdminWorkspaceBootstrap, WorkspaceScope } from "@/lib/admin/workspace";

function buildingNameForId(
  bootstrap: AdminWorkspaceBootstrap,
  projectId: string,
  buildingId: string
): string | null {
  const map = bootstrap.buildingIdsByProject[projectId] ?? {};
  const entry = Object.entries(map).find(([, id]) => id === buildingId);
  return entry?.[0] ?? null;
}

function floorNameForId(
  bootstrap: AdminWorkspaceBootstrap,
  projectId: string,
  buildingName: string,
  floorId: string
): string | null {
  const map = bootstrap.floorIdsByProject[projectId]?.[buildingName] ?? {};
  const entry = Object.entries(map).find(([, id]) => id === floorId);
  return entry?.[0] ?? null;
}

export function spatialRefsForScope(
  bootstrap: AdminWorkspaceBootstrap,
  projectId: string | null,
  building: string,
  floor: string
): { buildingId: string | null; floorId: string | null } {
  if (!projectId || building === "all") {
    return { buildingId: null, floorId: null };
  }

  const buildingId = bootstrap.buildingIdsByProject[projectId]?.[building] ?? null;
  if (floor === "all" || !buildingId) {
    return { buildingId, floorId: null };
  }

  const floorId =
    bootstrap.floorIdsByProject[projectId]?.[building]?.[floor] ?? null;

  return { buildingId, floorId };
}

export function normalizeWorkspaceScope(
  bootstrap: AdminWorkspaceBootstrap,
  scope: WorkspaceScope
): WorkspaceScope {
  if (!scope.projectId) {
    return {
      ...scope,
      building: "all",
      floor: "all",
      buildingId: null,
      floorId: null,
    };
  }

  const projectId = scope.projectId;
  let building = scope.building || "all";
  let floor = scope.floor || "all";
  let buildingId = scope.buildingId ?? null;
  let floorId = scope.floorId ?? null;

  if (buildingId) {
    const resolvedName = buildingNameForId(bootstrap, projectId, buildingId);
    if (resolvedName) {
      building = resolvedName;
    } else {
      buildingId = null;
      building = "all";
      floorId = null;
      floor = "all";
    }
  } else if (building !== "all") {
    buildingId = bootstrap.buildingIdsByProject[projectId]?.[building] ?? null;
  }

  if (floorId && building !== "all") {
    const resolvedFloor = floorNameForId(bootstrap, projectId, building, floorId);
    if (resolvedFloor) {
      floor = resolvedFloor;
    } else {
      floorId = null;
      floor = "all";
    }
  } else if (floor !== "all" && building !== "all") {
    floorId =
      bootstrap.floorIdsByProject[projectId]?.[building]?.[floor] ?? null;
  }

  if (building === "all") {
    floor = "all";
    buildingId = null;
    floorId = null;
  }

  if (floor === "all") {
    floorId = null;
  }

  return {
    ...scope,
    building,
    floor,
    buildingId,
    floorId,
  };
}
