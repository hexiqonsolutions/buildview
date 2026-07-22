"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import type { Building, Floor } from "@/lib/types";

export type SpatialHierarchy = {
  buildings: Array<Building & { floors: Floor[] }>;
};

export async function getProjectSpatialHierarchy(projectId: string): Promise<SpatialHierarchy> {
  const supabase = await createClient();

  const { data: buildings, error: buildingsError } = await supabase
    .from("buildings")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (buildingsError) throw new Error(buildingsError.message);

  const buildingIds = buildings?.map((b) => b.id) ?? [];
  if (buildingIds.length === 0) return { buildings: [] };

  const { data: floors, error: floorsError } = await supabase
    .from("floors")
    .select("*")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (floorsError) throw new Error(floorsError.message);

  const floorsByBuilding = new Map<string, Floor[]>();
  floors?.forEach((floor) => {
    const list = floorsByBuilding.get(floor.building_id) ?? [];
    list.push(floor);
    floorsByBuilding.set(floor.building_id, list);
  });

  return {
    buildings:
      buildings?.map((building) => ({
        ...building,
        floors: floorsByBuilding.get(building.id) ?? [],
      })) ?? [],
  };
}

function revalidateSpatialPaths(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/upload");
  revalidatePath("/admin/tours");
}

export async function createBuilding(projectId: string, name: string) {
  await requireBuildViewStaff();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Building name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buildings")
    .insert({
      project_id: projectId,
      name: trimmed,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateSpatialPaths(projectId);
  return data.id;
}

export async function createFloor(buildingId: string, name: string) {
  await requireBuildViewStaff();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Floor name is required.");

  const supabase = await createClient();

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", buildingId)
    .is("deleted_at", null)
    .single();

  if (buildingError || !building) throw new Error("Building not found.");

  const { data, error } = await supabase
    .from("floors")
    .insert({
      building_id: buildingId,
      name: trimmed,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateSpatialPaths(building.project_id);
  return data.id;
}

export async function deleteBuilding(buildingId: string) {
  await requireBuildViewStaff();
  const supabase = await createClient();

  const { data: building, error: fetchError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", buildingId)
    .single();

  if (fetchError || !building) throw new Error("Building not found.");

  const now = new Date().toISOString();

  const { error: floorsError } = await supabase
    .from("floors")
    .update({ deleted_at: now })
    .eq("building_id", buildingId)
    .is("deleted_at", null);

  if (floorsError) throw new Error(floorsError.message);

  const { error } = await supabase
    .from("buildings")
    .update({ deleted_at: now })
    .eq("id", buildingId);

  if (error) throw new Error(error.message);
  revalidateSpatialPaths(building.project_id);
}

export async function deleteFloor(floorId: string) {
  await requireBuildViewStaff();
  const supabase = await createClient();

  const { data: floor, error: fetchError } = await supabase
    .from("floors")
    .select("building_id")
    .eq("id", floorId)
    .single();

  if (fetchError || !floor) throw new Error("Floor not found.");

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", floor.building_id)
    .single();

  if (buildingError || !building) throw new Error("Building not found.");

  const projectId = building.project_id;

  const { error } = await supabase
    .from("floors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", floorId);

  if (error) throw new Error(error.message);
  revalidateSpatialPaths(projectId);
}
