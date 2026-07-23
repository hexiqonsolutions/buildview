import type { Project } from "@/lib/types";
import type { WorkspaceScope } from "@/lib/admin/workspace";
import {
  filterToursByScope,
  parseTourWorkspaceMeta,
} from "@/lib/admin/tour-metadata";

export { filterToursByScope, parseTourWorkspaceMeta };
export const WORKSPACE_PARAM_KEYS = {
  client: "client",
  project: "project",
  building: "building",
  floor: "floor",
  buildingId: "buildingId",
  floorId: "floorId",
} as const;

export function parseWorkspaceScope(
  params: Record<string, string | string[] | undefined> | URLSearchParams
): WorkspaceScope {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const value = params[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const buildingId = get(WORKSPACE_PARAM_KEYS.buildingId) ?? null;
  const floorId = get(WORKSPACE_PARAM_KEYS.floorId) ?? null;

  return {
    clientId: get(WORKSPACE_PARAM_KEYS.client) ?? null,
    projectId: get(WORKSPACE_PARAM_KEYS.project) ?? null,
    building: buildingId ? "all" : get(WORKSPACE_PARAM_KEYS.building) ?? "all",
    floor: floorId ? "all" : get(WORKSPACE_PARAM_KEYS.floor) ?? "all",
    buildingId,
    floorId,
  };
}

const WORKSPACE_PARAM_VALUES = Object.values(WORKSPACE_PARAM_KEYS);

/** True when two scopes would produce the same workspace filters. */
export function workspaceScopesEqual(a: WorkspaceScope, b: WorkspaceScope): boolean {
  return (
    a.clientId === b.clientId &&
    a.projectId === b.projectId &&
    a.building === b.building &&
    a.floor === b.floor &&
    a.buildingId === b.buildingId &&
    a.floorId === b.floorId
  );
}

function clearWorkspaceParams(params: URLSearchParams) {
  for (const key of WORKSPACE_PARAM_VALUES) {
    params.delete(key);
  }
}

function applyAdminWorkspaceParams(params: URLSearchParams, scope: WorkspaceScope) {
  clearWorkspaceParams(params);
  if (scope.clientId) params.set(WORKSPACE_PARAM_KEYS.client, scope.clientId);
  if (scope.projectId) params.set(WORKSPACE_PARAM_KEYS.project, scope.projectId);

  if (scope.buildingId) {
    params.set(WORKSPACE_PARAM_KEYS.buildingId, scope.buildingId);
  } else if (scope.building && scope.building !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.building, scope.building);
  }

  if (scope.floorId) {
    params.set(WORKSPACE_PARAM_KEYS.floorId, scope.floorId);
  } else if (scope.floor && scope.floor !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.floor, scope.floor);
  }
}

function applyPortalWorkspaceParams(params: URLSearchParams, scope: WorkspaceScope) {
  clearWorkspaceParams(params);
  if (scope.projectId) params.set(WORKSPACE_PARAM_KEYS.project, scope.projectId);

  if (scope.buildingId) {
    params.set(WORKSPACE_PARAM_KEYS.buildingId, scope.buildingId);
  } else if (scope.building && scope.building !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.building, scope.building);
  }

  if (scope.floorId) {
    params.set(WORKSPACE_PARAM_KEYS.floorId, scope.floorId);
  } else if (scope.floor && scope.floor !== "all") {
    params.set(WORKSPACE_PARAM_KEYS.floor, scope.floor);
  }
}

export function scopeToQueryString(scope: WorkspaceScope): string {
  const params = new URLSearchParams();
  applyAdminWorkspaceParams(params, scope);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Portal deep links omit client — the signed-in user's client is implicit. */
export function scopeToPortalQueryString(scope: WorkspaceScope): string {
  const params = new URLSearchParams();
  applyPortalWorkspaceParams(params, scope);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Merge workspace scope into the current URL search params without dropping
 * unrelated keys (e.g. `tab`). Returns null when nothing would change.
 */
export function mergeWorkspaceIntoSearchParams(
  current: URLSearchParams,
  scope: WorkspaceScope,
  mode: "admin" | "portal"
): string | null {
  const next = new URLSearchParams(current.toString());
  if (mode === "admin") {
    applyAdminWorkspaceParams(next, scope);
  } else {
    applyPortalWorkspaceParams(next, scope);
  }

  const currentQs = current.toString();
  const nextQs = next.toString();
  if (currentQs === nextQs) return null;
  return nextQs ? `?${nextQs}` : "";
}

export function mergeWorkspaceScope(
  base: WorkspaceScope,
  partial: Partial<WorkspaceScope>
): WorkspaceScope {
  return { ...base, ...partial };
}

export function filterProjectsByScope(
  projects: Project[],
  scope: WorkspaceScope
): Project[] {
  let list = projects;
  if (scope.clientId) {
    list = list.filter((p) => p.client_id === scope.clientId);
  }
  if (scope.projectId) {
    list = list.filter((p) => p.id === scope.projectId);
  }
  return list;
}

export function projectIdsForScope(
  projects: Project[],
  scope: WorkspaceScope
): string[] {
  return filterProjectsByScope(projects, scope).map((p) => p.id);
}

export function filterByProjectScope<T extends { project_id: string }>(
  items: T[],
  scopedProjectIds: Set<string>,
  scope: WorkspaceScope
): T[] {
  if (!scope.clientId && !scope.projectId) return items;
  return items.filter((item) => scopedProjectIds.has(item.project_id));
}

export type SpatialScopedItem = {
  project_id: string;
  building?: string | null;
  floor?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
  description?: string | null;
};

export function resolveSpatialFields(item: SpatialScopedItem): {
  building?: string;
  floor?: string;
} {
  const fromMeta = parseTourWorkspaceMeta(item.description ?? null);
  return {
    building: item.building ?? fromMeta.building,
    floor: item.floor ?? fromMeta.floor,
  };
}

function matchesBuildingScope(
  item: SpatialScopedItem,
  scope: WorkspaceScope,
  buildingName?: string
): boolean {
  if (scope.building === "all" && !scope.buildingId) return true;

  if (scope.buildingId) {
    if (item.building_id) return item.building_id === scope.buildingId;
    return buildingName === scope.building;
  }

  return buildingName === scope.building;
}

function matchesFloorScope(
  item: SpatialScopedItem,
  scope: WorkspaceScope,
  floorName?: string
): boolean {
  if (scope.floor === "all" && !scope.floorId) return true;

  if (scope.floorId) {
    if (item.floor_id) return item.floor_id === scope.floorId;
    return floorName === scope.floor;
  }

  return floorName === scope.floor;
}

export function matchesSpatialScope(
  item: SpatialScopedItem,
  scope: WorkspaceScope,
  scopedProjectIds: Set<string>
): boolean {
  if (scope.clientId || scope.projectId) {
    if (!scopedProjectIds.has(item.project_id)) return false;
  }

  const { building, floor } = resolveSpatialFields(item);

  if (!matchesBuildingScope(item, scope, building)) return false;
  if (!matchesFloorScope(item, scope, floor)) return false;

  return true;
}

export function filterBySpatialScope<T extends SpatialScopedItem>(
  items: T[],
  scope: WorkspaceScope,
  scopedProjectIds: Set<string>
): T[] {
  if (
    !scope.clientId &&
    !scope.projectId &&
    scope.building === "all" &&
    scope.floor === "all" &&
    !scope.buildingId &&
    !scope.floorId
  ) {
    return items;
  }
  return items.filter((item) => matchesSpatialScope(item, scope, scopedProjectIds));
}
