import type { EnrichedTour } from "@/lib/comparison/types";
import { matchesSpatialScope, type SpatialScopedItem } from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";

export type ComparisonSpatialScope = Pick<
  WorkspaceScope,
  "building" | "floor" | "buildingId" | "floorId"
>;

/** Shared building/floor context when both scans target the same location. */
export function spatialScopeFromScans(
  scanA: EnrichedTour,
  scanB: EnrichedTour
): ComparisonSpatialScope | null {
  const aBuildingId = scanA.metadata.building_id ?? null;
  const bBuildingId = scanB.metadata.building_id ?? null;
  const aFloorId = scanA.metadata.floor_id ?? null;
  const bFloorId = scanB.metadata.floor_id ?? null;

  if (aBuildingId && aBuildingId === bBuildingId) {
    const sameFloor = aFloorId && aFloorId === bFloorId;
    return {
      building: "all",
      floor: sameFloor && scanA.metadata.floor ? scanA.metadata.floor : "all",
      buildingId: aBuildingId,
      floorId: sameFloor ? aFloorId : null,
    };
  }

  const aBuilding = scanA.metadata.building;
  const bBuilding = scanB.metadata.building;
  if (
    aBuilding &&
    bBuilding &&
    aBuilding === bBuilding &&
    aBuilding !== "Main Building"
  ) {
    const sameFloor =
      scanA.metadata.floor &&
      scanA.metadata.floor === scanB.metadata.floor &&
      scanA.metadata.floor !== "All Floors";
    return {
      building: aBuilding,
      floor: sameFloor ? scanA.metadata.floor : "all",
      buildingId: aBuildingId,
      floorId: sameFloor ? aFloorId : null,
    };
  }

  return null;
}

export function filterByComparisonSpatial<T extends SpatialScopedItem>(
  items: T[],
  spatial: ComparisonSpatialScope | null,
  projectId: string
): T[] {
  if (!spatial) return items;

  const scope: WorkspaceScope = {
    clientId: null,
    projectId,
    building: spatial.building,
    floor: spatial.floor,
    buildingId: spatial.buildingId,
    floorId: spatial.floorId,
  };

  const projectIds = new Set([projectId]);
  return items.filter((item) => matchesSpatialScope(item, scope, projectIds));
}

export function tourMatchesCompareFilters(
  tour: EnrichedTour,
  projectId: string,
  spatial: ComparisonSpatialScope
): boolean {
  const scope: WorkspaceScope = {
    clientId: null,
    projectId,
    building: spatial.building,
    floor: spatial.floor,
    buildingId: spatial.buildingId,
    floorId: spatial.floorId,
  };

  return matchesSpatialScope(
    {
      project_id: tour.project_id,
      building_id: tour.metadata.building_id,
      floor_id: tour.metadata.floor_id,
      description: tour.description,
      building: tour.metadata.building,
      floor: tour.metadata.floor,
    },
    scope,
    new Set([projectId])
  );
}
