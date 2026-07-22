import type { WorkspaceScope } from "@/lib/admin/workspace";
import type { ProjectTour } from "@/lib/types";

export type TourWorkspaceMeta = {
  building?: string;
  floor?: string;
  building_id?: string | null;
  floor_id?: string | null;
  engineer?: string;
  notes?: string;
};

export type TourSpatialItem = Pick<ProjectTour, "project_id" | "description"> & {
  building_id?: string | null;
  floor_id?: string | null;
};

export function parseTourWorkspaceMeta(description: string | null): TourWorkspaceMeta {
  if (!description?.trim()) return {};
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    return {
      building: typeof parsed.building === "string" ? parsed.building : undefined,
      floor: typeof parsed.floor === "string" ? parsed.floor : undefined,
      building_id:
        typeof parsed.buildingId === "string"
          ? parsed.buildingId
          : typeof parsed.building_id === "string"
            ? parsed.building_id
            : null,
      floor_id:
        typeof parsed.floorId === "string"
          ? parsed.floorId
          : typeof parsed.floor_id === "string"
            ? parsed.floor_id
            : null,
      engineer: typeof parsed.engineer === "string" ? parsed.engineer : undefined,
      notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
    };
  } catch {
    return {};
  }
}

export function resolveTourSpatialRefs(tour: TourSpatialItem): {
  building?: string;
  floor?: string;
  building_id: string | null;
  floor_id: string | null;
} {
  const meta = parseTourWorkspaceMeta(tour.description);
  return {
    building: meta.building,
    floor: meta.floor,
    building_id: tour.building_id ?? meta.building_id ?? null,
    floor_id: tour.floor_id ?? meta.floor_id ?? null,
  };
}

export function buildTourDescription(
  meta: TourWorkspaceMeta & { engineer?: string; notes?: string }
): string | undefined {
  const payload: Record<string, string> = {};
  if (meta.building) payload.building = meta.building;
  if (meta.floor) payload.floor = meta.floor;
  if (meta.building_id) payload.buildingId = meta.building_id;
  if (meta.floor_id) payload.floorId = meta.floor_id;
  if (meta.engineer) payload.engineer = meta.engineer;
  if (meta.notes) payload.notes = meta.notes;
  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
}

function matchesBuildingScope(
  refs: ReturnType<typeof resolveTourSpatialRefs>,
  scope: WorkspaceScope
): boolean {
  if (scope.building === "all" && !scope.buildingId) return true;

  if (scope.buildingId) {
    if (refs.building_id) return refs.building_id === scope.buildingId;
    return refs.building === scope.building;
  }

  return refs.building === scope.building;
}

function matchesFloorScope(
  refs: ReturnType<typeof resolveTourSpatialRefs>,
  scope: WorkspaceScope
): boolean {
  if (scope.floor === "all" && !scope.floorId) return true;

  if (scope.floorId) {
    if (refs.floor_id) return refs.floor_id === scope.floorId;
    return refs.floor === scope.floor;
  }

  return refs.floor === scope.floor;
}

export function tourMatchesWorkspaceScope(
  tour: TourSpatialItem,
  scope: WorkspaceScope,
  scopedProjectIds: Set<string>
): boolean {
  if (scope.clientId || scope.projectId) {
    if (!scopedProjectIds.has(tour.project_id)) return false;
  }

  const refs = resolveTourSpatialRefs(tour);
  if (!matchesBuildingScope(refs, scope)) return false;
  if (!matchesFloorScope(refs, scope)) return false;
  return true;
}

export function filterToursByScope<T extends TourSpatialItem>(
  tours: T[],
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
    return tours;
  }

  return tours.filter((tour) =>
    tourMatchesWorkspaceScope(tour, scope, scopedProjectIds)
  );
}
