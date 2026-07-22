import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export type SpatialRefs = {
  building: string | null;
  floor: string | null;
  building_id: string | null;
  floor_id: string | null;
};

const EMPTY_SPATIAL: SpatialRefs = {
  building: null,
  floor: null,
  building_id: null,
  floor_id: null,
};

type DbClient = SupabaseClient<Database>;

export async function resolveSpatialRefs(
  supabase: DbClient,
  projectId: string,
  building?: string | null,
  floor?: string | null
): Promise<SpatialRefs> {
  const buildingName = building?.trim() || null;
  const floorName = floor?.trim() || null;

  if (!buildingName) {
    return EMPTY_SPATIAL;
  }

  const { data: buildingRow } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("name", buildingName)
    .is("deleted_at", null)
    .maybeSingle();

  if (!buildingRow) {
    return {
      building: buildingName,
      floor: floorName,
      building_id: null,
      floor_id: null,
    };
  }

  if (!floorName) {
    return {
      building: buildingRow.name,
      floor: null,
      building_id: buildingRow.id,
      floor_id: null,
    };
  }

  const { data: floorRow } = await supabase
    .from("floors")
    .select("id, name")
    .eq("building_id", buildingRow.id)
    .eq("name", floorName)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    building: buildingRow.name,
    floor: floorRow?.name ?? floorName,
    building_id: buildingRow.id,
    floor_id: floorRow?.id ?? null,
  };
}

export async function resolveSpatialRefsByIds(
  supabase: DbClient,
  buildingId?: string | null,
  floorId?: string | null
): Promise<SpatialRefs> {
  if (!buildingId) {
    return EMPTY_SPATIAL;
  }

  const { data: buildingRow } = await supabase
    .from("buildings")
    .select("id, name, project_id")
    .eq("id", buildingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!buildingRow) {
    return EMPTY_SPATIAL;
  }

  if (!floorId) {
    return {
      building: buildingRow.name,
      floor: null,
      building_id: buildingRow.id,
      floor_id: null,
    };
  }

  const { data: floorRow } = await supabase
    .from("floors")
    .select("id, name")
    .eq("id", floorId)
    .eq("building_id", buildingRow.id)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    building: buildingRow.name,
    floor: floorRow?.name ?? null,
    building_id: buildingRow.id,
    floor_id: floorRow?.id ?? null,
  };
}

export async function resolveSpatialForWrite(
  supabase: DbClient,
  projectId: string,
  input: {
    building?: string | null;
    floor?: string | null;
    building_id?: string | null;
    floor_id?: string | null;
  }
): Promise<SpatialRefs> {
  if (input.building_id || input.floor_id) {
    return resolveSpatialRefsByIds(supabase, input.building_id, input.floor_id);
  }

  return resolveSpatialRefs(supabase, projectId, input.building, input.floor);
}
