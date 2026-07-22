"use client";

import { useState, useTransition } from "react";
import { Building2, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createBuilding,
  createFloor,
  deleteBuilding,
  deleteFloor,
  type SpatialHierarchy,
} from "@/lib/actions/buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BuildingsFloorsManager({
  projectId,
  initialHierarchy,
}: {
  projectId: string;
  initialHierarchy: SpatialHierarchy;
}) {
  const [hierarchy, setHierarchy] = useState(initialHierarchy);
  const [buildingName, setBuildingName] = useState("");
  const [floorNames, setFloorNames] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAddBuilding() {
    if (!buildingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createBuilding(projectId, buildingName);
        setBuildingName("");
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add building");
      }
    });
  }

  function handleAddFloor(buildingId: string) {
    const name = floorNames[buildingId]?.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      try {
        await createFloor(buildingId, name);
        setFloorNames((prev) => ({ ...prev, [buildingId]: "" }));
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add floor");
      }
    });
  }

  function handleDeleteBuilding(buildingId: string) {
    if (!confirm("Delete this building and all its floors?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBuilding(buildingId);
        setHierarchy((prev) => ({
          buildings: prev.buildings.filter((b) => b.id !== buildingId),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete building");
      }
    });
  }

  function handleDeleteFloor(floorId: string, buildingId: string) {
    if (!confirm("Delete this floor?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFloor(floorId);
        setHierarchy((prev) => ({
          buildings: prev.buildings.map((b) =>
            b.id === buildingId
              ? { ...b, floors: b.floors.filter((f) => f.id !== floorId) }
              : b
          ),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete floor");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">
          Define the physical structure for workspace selectors, uploads, and Matterport filtering.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="New building name (e.g. Tower A)"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            disabled={pending}
          />
          <Button onClick={handleAddBuilding} disabled={pending || !buildingName.trim()}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add building
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {hierarchy.buildings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">No buildings yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Add buildings and floors to power workspace selectors across admin modules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hierarchy.buildings.map((building) => (
            <div
              key={building.id}
              className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-accent" />
                  <p className="font-semibold text-slate-900 dark:text-white">{building.name}</p>
                  <span className="text-xs text-slate-400">{building.floors.length} floors</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-600"
                  onClick={() => handleDeleteBuilding(building.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 px-5 py-4">
                {building.floors.map((floor) => (
                  <div
                    key={floor.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      {floor.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => handleDeleteFloor(floor.id, building.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Input
                    placeholder="Add floor (e.g. Level 8)"
                    value={floorNames[building.id] ?? ""}
                    onChange={(e) =>
                      setFloorNames((prev) => ({ ...prev, [building.id]: e.target.value }))
                    }
                    disabled={pending}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleAddFloor(building.id)}
                    disabled={pending || !floorNames[building.id]?.trim()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add floor
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
