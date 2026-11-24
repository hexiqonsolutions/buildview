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
import {
  tradePercent,
  type RollupBasis,
  type StageDefinition,
  type ZoneInput,
} from "@/lib/progression/completion";
import {
  effectiveBasis,
  type CompletionActivity,
  type ZoneResult,
} from "@/lib/progression/zone-completion";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import {
  createZoneSchema,
  deleteZoneSchema,
  recordObservationSchema,
  rollupBasisSchema,
  setFloorPlanSchema,
  setZoneNaSchema,
  setZonePolygonSchema,
  floorPlanUploadSchema,
  updateZoneSchema,
  verifyObservationSchema,
} from "@/lib/validations/zone-progress";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import { STORAGE_BUCKETS, type UserRole } from "@/lib/types";
import { UPLOAD_RULES, verifyStoredUpload } from "@/lib/uploads/verify";

export type ZoneScanView = {
  id: string;
  name: string;
  date: string;
  matterportUrl: string;
  /** True when the scan is linked to this floor (else a project-wide scan). */
  onFloor: boolean;
};

export type ZoneFloorView = {
  floorId: string;
  label: string;
  /** Signed URL of the floor-plan image (migration 049), null when none. */
  planUrl: string | null;
  /** Scans for this floor first (newest first), then project-wide scans. */
  scans: ZoneScanView[];
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
      /** Each trade's % across every zone in the project (building trade summary). */
      projectTrades: Record<string, number | null>;
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
          .select("*")
          .in("building_id", buildingList.map((b) => b.id))
          .is("deleted_at", null)
      : { data: [] as { id: string; name: string; building_id: string; sort_order: number }[] };

    // Floor-plan images (signed) and the project's scans, for the plan view.
    const planPaths = ((floors ?? []) as Array<{ plan_image_path?: string | null }>)
      .map((f) => f.plan_image_path)
      .filter((p): p is string => Boolean(p));
    const signed = planPaths.length
      ? (await admin.storage.from(STORAGE_BUCKETS.PROJECT_MEDIA).createSignedUrls(planPaths, 60 * 60 * 6)).data ?? []
      : [];
    const planUrlByPath = new Map(
      signed.filter((e) => !e.error && e.path).map((e) => [e.path as string, e.signedUrl as string])
    );
    const { data: tourRows } = await admin
      .from("project_tours")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    const tours = ((tourRows ?? []) as Array<{
      id: string;
      name: string;
      capture_date: string | null;
      created_at: string;
      matterport_url: string;
      floor_id?: string | null;
      archived_at?: string | null;
    }>)
      .filter((t) => !t.archived_at)
      .map((t) => ({
        id: t.id,
        name: t.name,
        date: (t.capture_date ?? t.created_at).slice(0, 10),
        matterportUrl: t.matterport_url,
        floorId: t.floor_id ?? null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

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
        const planPath = (floor as { plan_image_path?: string | null }).plan_image_path ?? null;
        return {
          floorId: floor.id as string,
          label: `${buildingName.get(floor.building_id as string) ?? "Building"} · ${floor.name}`,
          planUrl: planPath ? (planUrlByPath.get(planPath) ?? null) : null,
          scans: [
            ...tours.filter((t) => t.floorId === floor.id).map((t) => ({ ...t, onFloor: true })),
            ...tours.filter((t) => t.floorId !== floor.id).map((t) => ({ ...t, onFloor: false })),
          ].map(({ floorId: _floorId, ...rest }) => rest),
          percent: r ? r.percent : null,
          zones: r?.zones ?? [],
          trades: r?.trades ?? {},
        };
      });

    // Building-wide trade summary: every zone, same zone weights as the floors.
    const allZones: ZoneInput[] = [...results.values()].flatMap((floorResult) =>
      floorResult.zones.map((zone) => {
        const rec = data.zones.find((z) => z.id === zone.id);
        return {
          id: zone.id,
          name: zone.name,
          area: rec?.area ?? null,
          customWeight: rec?.customWeight ?? null,
          activities: data.activities.map((a) => ({
            key: a.key,
            name: a.name,
            weight: a.weight,
            percent: zone.cells[a.key]?.percent ?? null,
          })),
        };
      })
    );
    const basisForTrades = effectiveBasis(data.zones, data.basis);
    const projectTrades: Record<string, number | null> = {};
    for (const a of data.activities) projectTrades[a.key] = tradePercent(allZones, a.key, basisForTrades);

    return {
      available: true,
      projectTrades,
      projectId,
      canRecord: canEditProgression(actor.role),
      canManage: canEditProgression(actor.role),
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

/**
 * Zone setup (zones, N/A, floor plans, outlines, roll-up): BuildView staff and
 * the client's progression editors (Client Admin, Site Supervisor, Site
 * Engineer) with access to the project.
 */
async function zoneEditor(projectId: string) {
  const actor = await requireZoneAccess(projectId);
  if (!canEditProgression(actor.role)) {
    throw new PublicError("You can view zones but not change them.");
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
    const actor = await zoneEditor(projectId);
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
    await zoneEditor(projectId);
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
    await zoneEditor(projectId);
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
    await zoneEditor(projectId);
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
    await zoneEditor(projectId);
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

/** Save (or clear) a zone's outline on the floor plan (staff). */
export async function setZonePolygon(input: unknown): Promise<Result> {
  const parsed = validate(setZonePolygonSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, zoneId, polygon } = parsed.data;
  try {
    await zoneEditor(projectId);
    const rounded = polygon?.map(([x, y]) => [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
    const { error } = await createServiceRoleClient()
      .from("progress_zones" as never)
      .update({ polygon: rounded ?? null } as never)
      .eq("id", zoneId)
      .eq("project_id", projectId);
    if (error) throw error;
    return finish(projectId);
  } catch (err) {
    return fail("zones:polygon", err, "Could not save the outline.");
  }
}

/**
 * Attach a floor-plan image (already uploaded to project-media under the
 * project folder) to a floor, or remove it with path null (staff).
 */
export async function setFloorPlan(input: unknown): Promise<Result> {
  const parsed = validate(setFloorPlanSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, floorId, path } = parsed.data;
  try {
    await zoneEditor(projectId);
    const admin = createServiceRoleClient();
    const { data: floor } = await admin
      .from("floors")
      .select("*, building:buildings!inner(project_id)")
      .eq("id", floorId)
      .maybeSingle();
    const row = floor as { plan_image_path?: string | null; building?: { project_id: string } } | null;
    if (row?.building?.project_id !== projectId) {
      return { ok: false, error: "That floor isn't part of this project." };
    }
    if (path) {
      if (!path.startsWith(`${projectId}/`)) {
        return { ok: false, error: "The image is outside the project folder." };
      }
      await verifyStoredUpload(UPLOAD_RULES.propertyFloorPlan, path, "setFloorPlan", { skipMagicBytes: true });
    }
    const { error } = await admin
      .from("floors")
      .update({ plan_image_path: path } as never)
      .eq("id", floorId);
    if (error) {
      if (isMissingTable(error)) {
        return { ok: false, error: "Floor plans need database migration 049. Run it in Supabase first." };
      }
      throw error;
    }
    const previous = row?.plan_image_path;
    if (previous && previous !== path) {
      await admin.storage.from(STORAGE_BUCKETS.PROJECT_MEDIA).remove([previous]).catch(() => undefined);
    }
    return finish(projectId);
  } catch (err) {
    return fail("zones:floorPlan", err, "Could not save the floor plan.");
  }
}

/**
 * Short-lived upload link for a floor-plan image. Client roles can't write to
 * the project-media bucket directly, so the server issues a one-off signed
 * upload URL inside the project folder; setFloorPlan then verifies the file.
 */
export async function createFloorPlanUploadUrl(input: unknown): Promise<
  { ok: true; path: string; token: string } | { ok: false; error: string }
> {
  const parsed = validate(floorPlanUploadSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, fileName } = parsed.data;
  try {
    await zoneEditor(projectId);
    const safeName = fileName.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80) || "floor-plan";
    const path = `${projectId}/floor-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { data, error } = await createServiceRoleClient()
      .storage.from(STORAGE_BUCKETS.PROJECT_MEDIA)
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("No upload URL");
    return { ok: true, path: data.path, token: data.token };
  } catch (err) {
    logServerError("zones:floorPlanUpload", err);
    return { ok: false, error: getErrorMessage(err, "Could not start the upload.") };
  }
}
