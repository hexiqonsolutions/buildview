"use client";

import { useEffect, useState } from "react";
import {
  getProjectSpatialHierarchy,
  type SpatialHierarchy,
} from "@/lib/actions/buildings";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const NO_SPATIAL = "none";

export type SpatialSelection = ReturnType<typeof useSpatialSelection>;

/**
 * Loads a project's towers/buildings and floors when the project changes and
 * tracks the selected tower + floor. Selection resets whenever the project
 * changes so an issue can never point at another project's floor.
 */
export function useSpatialSelection(projectId: string, active: boolean) {
  const [hierarchy, setHierarchy] = useState<SpatialHierarchy>({ buildings: [] });
  const [loading, setLoading] = useState(false);
  const [buildingId, setBuildingId] = useState<string>(NO_SPATIAL);
  const [floorId, setFloorId] = useState<string>(NO_SPATIAL);

  useEffect(() => {
    setBuildingId(NO_SPATIAL);
    setFloorId(NO_SPATIAL);
    if (!active || !projectId) {
      setHierarchy({ buildings: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getProjectSpatialHierarchy(projectId)
      .then((result) => {
        if (cancelled) return;
        setHierarchy(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Towers are optional — a failed load must never block reporting.
        setHierarchy({ buildings: [] });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, active]);

  const buildings = hierarchy.buildings;
  const selectedBuilding =
    buildingId !== NO_SPATIAL ? buildings.find((b) => b.id === buildingId) : undefined;
  const floors = selectedBuilding?.floors ?? [];
  const selectedFloor =
    floorId !== NO_SPATIAL ? floors.find((f) => f.id === floorId) : undefined;

  return {
    buildings,
    floors,
    loading,
    buildingId,
    floorId,
    buildingName: selectedBuilding?.name,
    floorName: selectedFloor?.name,
    selectBuilding(id: string) {
      setBuildingId(id);
      setFloorId(NO_SPATIAL);
    },
    selectFloor: setFloorId,
    reset() {
      setBuildingId(NO_SPATIAL);
      setFloorId(NO_SPATIAL);
    },
  };
}

interface TowerFloorSelectsProps {
  projectId: string;
  spatial: SpatialSelection;
  idPrefix: string;
  /** Slight label/spacing differences between the portal and admin dialogs. */
  labelClassName?: string;
}

export function TowerFloorSelects({
  projectId,
  spatial,
  idPrefix,
  labelClassName,
}: TowerFloorSelectsProps) {
  const { buildings, floors, loading, buildingId, floorId } = spatial;
  const hasBuildings = buildings.length > 0;
  const buildingChosen = buildingId !== NO_SPATIAL;

  const towerPlaceholder = !projectId
    ? "Select a project first"
    : loading
      ? "Loading towers…"
      : hasBuildings
        ? "Select tower"
        : "No towers added yet";

  const floorPlaceholder = !buildingChosen
    ? "Select a tower first"
    : loading
      ? "Loading floors…"
      : floors.length > 0
        ? "Select floor"
        : "No floors added yet";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tower`} className={labelClassName}>
          Tower / Building <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Select
          value={buildingId}
          onValueChange={spatial.selectBuilding}
          disabled={!projectId || loading || !hasBuildings}
        >
          <SelectTrigger id={`${idPrefix}-tower`} className="cursor-pointer">
            <SelectValue placeholder={towerPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {hasBuildings && (
              <SelectItem value={NO_SPATIAL}>No specific tower</SelectItem>
            )}
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {projectId && !loading && !hasBuildings && (
          <p className="text-[11px] leading-snug text-slate-400">
            No towers added for this project yet — you can still report the issue.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-floor`} className={labelClassName}>
          Floor <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Select
          value={floorId}
          onValueChange={spatial.selectFloor}
          disabled={!buildingChosen || loading || floors.length === 0}
        >
          <SelectTrigger id={`${idPrefix}-floor`} className="cursor-pointer">
            <SelectValue placeholder={floorPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {floors.length > 0 && (
              <SelectItem value={NO_SPATIAL}>No specific floor</SelectItem>
            )}
            {floors.map((floor) => (
              <SelectItem key={floor.id} value={floor.id}>
                {floor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
