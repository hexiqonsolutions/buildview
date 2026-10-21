"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import { ensureFloorProgression } from "@/lib/data/progression";
import { PROGRESSION_TRACKS } from "@/lib/progression/catalog";
import type { Building, Floor } from "@/lib/types";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import { LIMITS, text, uuid } from "@/lib/validations/primitives";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";

export type SpatialHierarchy = {
  buildings: Array<Building & { floors: Floor[] }>;
};

function isSpatialReadError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("permission denied") ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    (message.includes("relation") && (message.includes("buildings") || message.includes("floors")))
  );
}

export async function getProjectSpatialHierarchy(projectId: string): Promise<SpatialHierarchy> {
  if (!validate(uuid("Project"), projectId).success) return { buildings: [] };

  const supabase = await createClient();

  const { data: buildings, error: buildingsError } = await supabase
    .from("buildings")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (buildingsError) {
    if (isSpatialReadError(buildingsError)) return { buildings: [] };
    throw internalError("getProjectSpatialHierarchy", buildingsError);
  }

  const buildingIds = buildings?.map((b) => b.id) ?? [];
  if (buildingIds.length === 0) return { buildings: [] };

  const { data: floors, error: floorsError } = await supabase
    .from("floors")
    .select("*")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (floorsError) {
    if (isSpatialReadError(floorsError)) return { buildings: [] };
    throw internalError("getProjectSpatialHierarchy", floorsError);
  }

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
  parseOrThrow(uuid("Project"), projectId);
  const trimmed = parseOrThrow(text("Building name", { max: LIMITS.name }), name);
  await requireBuildViewStaff();

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

  if (error) throw internalError("createBuilding", error);
  revalidateSpatialPaths(projectId);
  return data.id;
}

export async function createFloor(buildingId: string, name: string) {
  parseOrThrow(uuid("Building"), buildingId);
  const trimmed = parseOrThrow(text("Floor name", { max: LIMITS.name }), name);
  await requireBuildViewStaff();

  const supabase = await createClient();

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", buildingId)
    .is("deleted_at", null)
    .single();

  if (buildingError || !building) throw new PublicError("Building not found.");

  const { data, error } = await supabase
    .from("floors")
    .insert({
      building_id: buildingId,
      name: trimmed,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw internalError("createFloor", error);

  // Every floor gets Pre-Slab + Post-Slab Progression checklists.
  try {
    for (const track of PROGRESSION_TRACKS) {
      await ensureFloorProgression(building.project_id, data.id, buildingId, null, track);
    }
  } catch (err) {
    console.warn("[createFloor] progression seed failed:", err);
  }

  revalidateSpatialPaths(building.project_id);
  revalidatePath(`/dashboard/projects/${building.project_id}`);
  return data.id;
}

/** Bulk-create Floor 1…N (or custom start), then rename later if needed. */
export async function createFloorsByCount(buildingId: string, count: number) {
  parseOrThrow(uuid("Building"), buildingId);
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n < 1 || n > 200) {
    throw new PublicError("Enter a floor count between 1 and 200.");
  }
  await requireBuildViewStaff();

  const supabase = await createClient();
  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", buildingId)
    .is("deleted_at", null)
    .single();

  if (buildingError || !building) throw new PublicError("Building not found.");

  const { data: existing } = await supabase
    .from("floors")
    .select("name, sort_order")
    .eq("building_id", buildingId)
    .is("deleted_at", null);

  const usedNames = new Set((existing ?? []).map((f) => f.name.toLowerCase()));
  let sortBase = Math.max(0, ...(existing ?? []).map((f) => f.sort_order ?? 0)) + 1;

  const createdIds: string[] = [];
  for (let i = 1; i <= n; i++) {
    let name = `Floor ${i}`;
    let suffix = 0;
    while (usedNames.has(name.toLowerCase())) {
      suffix += 1;
      name = `Floor ${i}.${suffix}`;
    }
    usedNames.add(name.toLowerCase());

    const { data, error } = await supabase
      .from("floors")
      .insert({
        building_id: buildingId,
        name,
        sort_order: sortBase++,
      })
      .select("id")
      .single();

    if (error) throw internalError("createFloorsByCount", error);
    createdIds.push(data.id);

    try {
      for (const track of PROGRESSION_TRACKS) {
        await ensureFloorProgression(building.project_id, data.id, buildingId, null, track);
      }
    } catch (err) {
      console.warn("[createFloorsByCount] progression seed failed:", err);
    }
  }

  revalidateSpatialPaths(building.project_id);
  revalidatePath(`/dashboard/projects/${building.project_id}`);
  return createdIds;
}

export async function renameFloor(floorId: string, name: string) {
  parseOrThrow(uuid("Floor"), floorId);
  const trimmed = parseOrThrow(text("Floor name", { max: LIMITS.name }), name);
  await requireBuildViewStaff();

  const supabase = await createClient();
  const { data: floor, error: fetchError } = await supabase
    .from("floors")
    .select("building_id")
    .eq("id", floorId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !floor) throw new PublicError("Floor not found.");

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", floor.building_id)
    .single();

  if (buildingError || !building) throw new PublicError("Building not found.");

  const { error } = await supabase
    .from("floors")
    .update({ name: trimmed })
    .eq("id", floorId);

  if (error) throw internalError("renameFloor", error);
  revalidateSpatialPaths(building.project_id);
  revalidatePath(`/dashboard/projects/${building.project_id}`);
}

export async function deleteBuilding(buildingId: string) {
  parseOrThrow(uuid("Building"), buildingId);
  await requireBuildViewStaff();
  const supabase = await createClient();

  const { data: building, error: fetchError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", buildingId)
    .single();

  if (fetchError || !building) throw new PublicError("Building not found.");

  const now = new Date().toISOString();

  const { data: floorRows } = await supabase
    .from("floors")
    .select("id")
    .eq("building_id", buildingId)
    .is("deleted_at", null);

  const { error: floorsError } = await supabase
    .from("floors")
    .update({ deleted_at: now })
    .eq("building_id", buildingId)
    .is("deleted_at", null);

  if (floorsError) throw internalError("deleteBuilding", floorsError);

  const floorIds = (floorRows ?? []).map((f) => f.id);
  if (floorIds.length > 0) {
    await supabase
      .from("project_progressions")
      .update({ deleted_at: now })
      .in("floor_id", floorIds)
      .is("deleted_at", null);
  }

  const { error } = await supabase
    .from("buildings")
    .update({ deleted_at: now })
    .eq("id", buildingId);

  if (error) throw internalError("deleteBuilding", error);
  revalidateSpatialPaths(building.project_id);
  revalidatePath(`/dashboard/projects/${building.project_id}`);
}

export async function deleteFloor(floorId: string) {
  parseOrThrow(uuid("Floor"), floorId);
  await requireBuildViewStaff();
  const supabase = await createClient();

  const { data: floor, error: fetchError } = await supabase
    .from("floors")
    .select("building_id")
    .eq("id", floorId)
    .single();

  if (fetchError || !floor) throw new PublicError("Floor not found.");

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("project_id")
    .eq("id", floor.building_id)
    .single();

  if (buildingError || !building) throw new PublicError("Building not found.");

  const projectId = building.project_id;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("floors")
    .update({ deleted_at: now })
    .eq("id", floorId);

  if (error) throw internalError("deleteFloor", error);

  // Soft-delete linked progression so ticks do not orphan against deleted floors
  await supabase
    .from("project_progressions")
    .update({ deleted_at: now })
    .eq("floor_id", floorId)
    .is("deleted_at", null);

  revalidateSpatialPaths(projectId);
  revalidatePath(`/dashboard/projects/${projectId}`);
}
