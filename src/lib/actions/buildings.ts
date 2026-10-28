"use server";

import { after } from "next/server";
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

/** Seed Pre/Post progression after the response so floor create stays fast. */
function seedProgressionAfter(
  projectId: string,
  floors: Array<{ id: string; buildingId: string }>
) {
  after(async () => {
    try {
      for (const floor of floors) {
        for (const track of PROGRESSION_TRACKS) {
          await ensureFloorProgression(
            projectId,
            floor.id,
            floor.buildingId,
            null,
            track
          );
        }
      }
      revalidatePath(`/dashboard/projects/${projectId}`);
      revalidateSpatialPaths(projectId);
    } catch (err) {
      console.warn("[buildings] deferred progression seed failed:", err);
    }
  });
}

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

  // Active name clash
  const { data: activeClash } = await supabase
    .from("floors")
    .select("id")
    .eq("building_id", buildingId)
    .eq("name", trimmed)
    .is("deleted_at", null)
    .maybeSingle();

  if (activeClash) {
    throw new PublicError(`A floor named "${trimmed}" already exists on this building.`);
  }

  // Revive soft-deleted floor with the same name (old unique constraint / prior deletes)
  const { data: softDeleted } = await supabase
    .from("floors")
    .select("id, sort_order")
    .eq("building_id", buildingId)
    .eq("name", trimmed)
    .not("deleted_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let floorId: string;

  if (softDeleted?.id) {
    const { error: reviveError } = await supabase
      .from("floors")
      .update({ deleted_at: null })
      .eq("id", softDeleted.id);
    if (reviveError) throw internalError("createFloor", reviveError);
    floorId = softDeleted.id;
  } else {
    const { data: existing } = await supabase
      .from("floors")
      .select("sort_order")
      .eq("building_id", buildingId)
      .is("deleted_at", null);

    const sortOrders = (existing ?? []).map((f) => f.sort_order ?? 0);
    const sortOrder = (sortOrders.length ? Math.max(...sortOrders) : 0) + 1;

    const { data, error } = await supabase
      .from("floors")
      .insert({
        building_id: buildingId,
        name: trimmed,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new PublicError(`A floor named "${trimmed}" already exists on this building.`);
      }
      throw internalError("createFloor", error);
    }
    floorId = data.id;
  }

  seedProgressionAfter(building.project_id, [{ id: floorId, buildingId }]);
  revalidateSpatialPaths(building.project_id);
  revalidatePath(`/dashboard/projects/${building.project_id}`);
  return floorId;
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

  const { data: allFloors } = await supabase
    .from("floors")
    .select("id, name, sort_order, deleted_at")
    .eq("building_id", buildingId);

  const active = (allFloors ?? []).filter((f) => !f.deleted_at);
  const softByName = new Map(
    (allFloors ?? [])
      .filter((f) => f.deleted_at)
      .map((f) => [f.name.toLowerCase(), f] as const)
  );
  const usedNames = new Set(active.map((f) => f.name.toLowerCase()));
  const sortOrders = active.map((f) => f.sort_order ?? 0);
  let sortBase = (sortOrders.length ? Math.max(...sortOrders) : 0) + 1;

  const createdIds: string[] = [];
  const toInsert: Array<{ building_id: string; name: string; sort_order: number }> = [];

  for (let i = 1; i <= n; i++) {
    let name = `Floor ${i}`;
    let suffix = 0;
    while (usedNames.has(name.toLowerCase())) {
      suffix += 1;
      name = `Floor ${i}.${suffix}`;
    }
    usedNames.add(name.toLowerCase());

    const soft = softByName.get(name.toLowerCase());
    if (soft) {
      const { error: reviveError } = await supabase
        .from("floors")
        .update({ deleted_at: null, sort_order: sortBase++ })
        .eq("id", soft.id);
      if (reviveError) throw internalError("createFloorsByCount", reviveError);
      createdIds.push(soft.id);
      softByName.delete(name.toLowerCase());
    } else {
      toInsert.push({
        building_id: buildingId,
        name,
        sort_order: sortBase++,
      });
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("floors")
      .insert(toInsert)
      .select("id");

    if (error) {
      if (error.code === "23505") {
        throw new PublicError(
          "Could not add floors because of a name conflict. Refresh and try again."
        );
      }
      throw internalError("createFloorsByCount", error);
    }
    for (const row of inserted ?? []) createdIds.push(row.id);
  }

  seedProgressionAfter(
    building.project_id,
    createdIds.map((id) => ({ id, buildingId }))
  );

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
