"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import {
  canEditProgression,
  canVerifyProgression,
  canViewProgression,
  isBuildViewStaffRole,
} from "@/lib/auth/roles";
import { isConstructionProjectForProgression } from "@/lib/data/progression";
import { loadZoneData, zoneFloorResults } from "@/lib/data/zone-progress";
import { todayInIndia } from "@/lib/progression/checklist-completion";
import type { RollupBasis, StageDefinition } from "@/lib/progression/completion";
import type { CompletionActivity, ZoneResult } from "@/lib/progression/zone-completion";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import {
  createZoneSchema,
  deleteZoneSchema,
  recordObservationSchema,
  rollupBasisSchema,
  setZoneNaSchema,
  updateZoneSchema,
  verifyObservationSchema,
} from "@/lib/validations/zone-progress";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import type { UserRole } from "@/lib/types";

export type ZoneFloorView = {
  floorId: string;
  label: string;
  /** Null when the floor has no zones (it uses the checklist). */
  percent: number | null;
  zones: ZoneResult[];
  trades: Record<string, number | null>;
};

export type ZoneProgressView =
  | { available: false; reason: string }
  | {
      available: true;
      projectId: string;
      canRecord: boolean;
      canManage: boolean;
      canVerify: boolean;
      verifiedOnly: boolean;
      basis: RollupBasis;
      activities: CompletionActivity[];
      stages: StageDefinition[];
      floors: ZoneFloorView[];
    };

const MIGRATION_MESSAGE =
  "Zones need database migration 048. Run it in Supabase first.";

async function requireZoneAccess(projectId: string) {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");
  const role = actor.role as UserRole;
  if (!canViewProgression(role)) throw new PublicError("You don't have access to Progression.");
  if (
    !isBuildViewStaffRole(role) &&
    !(await canViewProject({ userId: actor.userId, role, clientId: actor.clientId }, projectId))
  ) {
    throw new PublicError("You do not have access to this project.");
  }
  if (!(await isConstructionProjectForProgression(projectId))) {
    throw new PublicError("Progression is not available for this project.");
  }
  return { userId: actor.userId, role };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);
}

function isMissingTable(error: { message?: string } | null | undefined): boolean {
  return Boolean(error?.message && /relation|does not exist|schema cache|column/i.test(error.message));
}

/** Everything the Zones & trades section needs for one project. */
export async function getZoneProgress(projectId: string): Promise<ZoneProgressView> {
  if (!validate(projectIdSchema, projectId).success) return { available: false, reason: "Invalid project." };
  try {
    const actor = await requireZoneAccess(projectId);
    const admin = createServiceRoleClient();

    const { error: probe } = await admin.from("progress_zones" as never).select("id").limit(1);
    if (probe) return { available: false, reason: MIGRATION_MESSAGE };

    const [{ data: project }, { data: buildings }] = await Promise.all([
      admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
      admin.from("buildings").select("id, name, sort_order").eq("project_id", projectId).is("deleted_at", null),
    ]);
    const verifiedOnly =
      (project as { progress_verified_only?: boolean } | null)?.progress_verified_only === true;
    const buildingList = (buildings ?? []).sort(
      (a, b) => (a.sort_order as number) - (b.sort_order as number) || String(a.name).localeCompare(String(b.name))
    );
    const { data: floors } = buildingList.length
      ? await admin
          .from("floors")
          .select("id, name, building_id, sort_order")
          .in("building_id", buildingList.map((b) => b.id))
          .is("deleted_at", null)
      : { data: [] as { id: string; name: string; building_id: string; sort_order: number }[] };

    const data = (await loadZoneData([projectId])).get(projectId);
    if (!data) return { available: false, reason: MIGRATION_MESSAGE };
    const results = zoneFloorResults(data, todayInIndia(), verifiedOnly);
    const buildingName = new Map(buildingList.map((b) => [b.id as string, b.name as string]));
    const buildingOrder = new Map(buildingList.map((b, i) => [b.id as string, i]));

    const floorViews: ZoneFloorView[] = (floors ?? [])
      .sort(
        (a, b) =>
          (buildingOrder.get(a.building_id) ?? 0) - (buildingOrder.get(b.building_id) ?? 0) ||
          (a.sort_order as number) - (b.sort_order as number)
      )
      .map((floor) => {
        const r = results.get(floor.id as string);
        return {
          floorId: floor.id as string,
          label: `${buildingName.get(floor.building_id as string) ?? "Building"} · ${floor.name}`,
          percent: r ? r.percent : null,
          zones: r?.zones ?? [],
          trades: r?.trades ?? {},
        };
      });

    return {
      available: true,
      projectId,
      canRecord: canEditProgression(actor.role),
      canManage: isBuildViewStaffRole(actor.role),
      canVerify: canVerifyProgression(actor.role),
      verifiedOnly,
      basis: data.basis,
      activities: data.activities,
      stages: data.stages,
      floors: floorViews,
    };
  } catch (err) {
    return { available: false, reason: getErrorMessage(err, "Could not load zones.") };
  }
}

type Result = { ok: true; view: ZoneProgressView } | { ok: false; error: string };

async function staffOnly(projectId: string) {
  const actor = await requireZoneAccess(projectId);
  if (!isBuildViewStaffRole(actor.role)) {
    throw new PublicError("Only BuildView staff can set up zones.");
  }
  return actor;
}

async function finish(projectId: string): Promise<Result> {
  revalidateProject(projectId);
  return { ok: true, view: await getZoneProgress(projectId) };
}

function fail(scope: string, err: unknown, fallback: string): Result {
  logServerError(scope, err);
  return { ok: false, error: getErrorMessage(err, fallback) };
}

/** Add a flat / unit / room to a floor (staff). */
export async function createZone(input: unknown): Promise<Result> {
  const parsed = validate(createZoneSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, floorId, name, zoneType, area } = parsed.data;
  try {
    const actor = await staffOnly(projectId);
    const admin = createServiceRoleClient();
    const { data: floor } = await admin
      .from("floors")
      .select("id, building:buildings!inner(project_id)")
      .eq("id", floorId)
      .maybeSingle();
    if ((floor as { building?: { project_id: string } } | null)?.building?.project_id !== projectId) {
      return { ok: false, error: "That floor isn't part of this project." };
    }
    const { error } = await admin.from("progress_zones" as never).insert({
      project_id: projectId,
      floor_id: floorId,
      name,
      zone_type: zoneType,
      area_sqft: area,
      created_by: actor.userId,
    } as never);
    if (error) {
      if (isMissingTable(error)) return { ok: false, error: MIGRATION_MESSAGE };
      throw error;
    }
    return finish(projectId);
  } catch (err) {
    return fail("zones:create", err, "Could not add the zone.");
  }
}

export async function updateZone(input: unknown): Promise<Result> {
  const parsed = validate(updateZoneSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, zoneId, name, area } = parsed.data;
  try {
    await staffOnly(projectId);
    const { error } = await createServiceRoleClient()
      .from("progress_zones" as never)
      .update({ name, area_sqft: area } as never)
      .eq("id", zoneId)
      .eq("project_id", projectId);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:update", err, "Could not update the zone.");
  }
}

export async function deleteZone(input: unknown): Promise<Result> {
  const parsed = validate(deleteZoneSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, zoneId } = parsed.data;
  try {
    await staffOnly(projectId);
    const { error } = await createServiceRoleClient()
      .from("progress_zones" as never)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", zoneId)
      .eq("project_id", projectId);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:delete", err, "Could not remove the zone.");
  }
}

/** Mark an activity as not applicable (or applicable again) for a zone (staff). */
export async function setZoneNa(input: unknown): Promise<Result> {
  const parsed = validate(setZoneNaSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, zoneId, activityKey, na } = parsed.data;
  try {
    await staffOnly(projectId);
    const admin = createServiceRoleClient();
    const { data: zone } = await admin
      .from("progress_zones" as never)
      .select("id")
      .eq("id", zoneId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!zone) return { ok: false, error: "Zone not found." };
    const { error } = na
      ? await admin
          .from("progress_zone_na" as never)
          .upsert({ zone_id: zoneId, activity_key: activityKey } as never)
      : await admin
          .from("progress_zone_na" as never)
          .delete()
          .eq("zone_id", zoneId)
          .eq("activity_key", activityKey);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:na", err, "Could not update the activity.");
  }
}

/**
 * Record that an activity reached a stage in a zone today. Entries by a
 * verifier (staff / Client Admin) are verified on entry; others await review.
 */
export async function recordObservation(input: unknown): Promise<Result> {
  const parsed = validate(recordObservationSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, zoneId, activityKey, stageKey, note } = parsed.data;
  try {
    const actor = await requireZoneAccess(projectId);
    if (!canEditProgression(actor.role)) {
      return { ok: false, error: "You can view progress but not update it." };
    }
    const admin = createServiceRoleClient();
    const { data: zone } = await admin
      .from("progress_zones" as never)
      .select("id")
      .eq("id", zoneId)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!zone) return { ok: false, error: "Zone not found." };

    const data = (await loadZoneData([projectId])).get(projectId);
    if (!data?.activities.some((a) => a.key === activityKey)) {
      return { ok: false, error: "Unknown activity." };
    }
    if (!data.stages.some((s) => s.key === stageKey)) return { ok: false, error: "Unknown stage." };

    const verifier = canVerifyProgression(actor.role);
    const now = new Date().toISOString();
    const { error } = await admin.from("progress_observations" as never).insert({
      project_id: projectId,
      zone_id: zoneId,
      activity_key: activityKey,
      stage_key: stageKey,
      observed_on: todayInIndia(),
      note,
      source: "manual",
      entered_by: actor.userId,
      verification_status: verifier ? "verified" : null,
      verified_by: verifier ? actor.userId : null,
      verified_at: verifier ? now : null,
    } as never);
    if (error) {
      if (isMissingTable(error)) return { ok: false, error: MIGRATION_MESSAGE };
      throw error;
    }
    return finish(projectId);
  } catch (err) {
    return fail("zones:observe", err, "Could not save the update.");
  }
}

/** Verify or reject a zone observation (staff / Client Admin). */
export async function verifyObservation(input: unknown): Promise<Result> {
  const parsed = validate(verifyObservationSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, observationId, decision } = parsed.data;
  try {
    const actor = await requireZoneAccess(projectId);
    if (!canVerifyProgression(actor.role)) {
      return { ok: false, error: "Only BuildView staff or the Client Admin can verify progress." };
    }
    const { error } = await createServiceRoleClient()
      .from("progress_observations" as never)
      .update({
        verification_status: decision,
        verified_by: actor.userId,
        verified_at: new Date().toISOString(),
      } as never)
      .eq("id", observationId)
      .eq("project_id", projectId);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:verify", err, "Could not save the verification.");
  }
}

/** How zones roll up to a floor: area (default), equal or custom (staff). */
export async function setRollupBasis(input: unknown): Promise<Result> {
  const parsed = validate(rollupBasisSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, basis } = parsed.data;
  try {
    await staffOnly(projectId);
    const { error } = await createServiceRoleClient()
      .from("projects")
      .update({ completion_rollup_basis: basis } as never)
      .eq("id", projectId);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:basis", err, "Could not change the roll-up.");
  }
}
