import "server-only";
import { loadZoneData, zoneFloorPlanned, zoneFloorResults } from "@/lib/data/zone-progress";
import { buildSCurve, type SCurveFloor, type SCurvePoint } from "@/lib/progression/s-curve";
import {
  percentOnDate,
  projectCompletion,
  todayInIndia,
  type ChecklistFloorInput,
  type ChecklistStepRecord,
  type ProjectCompletion,
} from "@/lib/progression/checklist-completion";

import { cache } from "react";
import { getProgressionVersion, loadV2ProjectData, v2CompletionFor } from "@/lib/data/progression-v2";
import type { V2Result } from "@/lib/progression/v2-completion";
import {
  effectiveMethod,
  isConstructionMethod,
  methodOfTemplateKey,
  templateKeyFor,
  type ConstructionMethod,
} from "@/lib/progression/methods";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { canEditProgression, canVerifyProgression, canViewProgression } from "@/lib/auth/roles";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import {
  PROGRESSION_TEMPLATE_KEYS,
  PROGRESSION_TRACKS,
  type ProgressionTrack,
} from "@/lib/progression/catalog";
import {
  buildDailySeries,
  buildPhases,
  buildWeeklySeries,
  overallPercent,
} from "@/lib/progression/stats";
import type {
  CombinedFloorSummary,
  FloorProgressionSummary,
  ProgressionScan,
  ProgressionStepView,
  ProjectProgressionBundle,
  ProjectProgressionView,
  TrackProgressionSummary,
} from "@/lib/progression/types";
import type { UserRole } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import { uuid } from "@/lib/validations/primitives";

type Actor = {
  id: string;
  role: UserRole;
  clientId: string | null;
};

async function getProgressionActor(): Promise<Actor | null> {
  const active = await getActiveActor();
  if (!active) return null;
  return { id: active.userId, role: active.role, clientId: active.clientId };
}

async function assertProgressionReadable(projectId: string, actor: Actor): Promise<boolean> {
  if (!canViewProgression(actor.role)) return false;
  return canViewProject(
    { userId: actor.id, role: actor.role, clientId: actor.clientId },
    projectId
  );
}

/** True when the project's client portal is construction (not portfolio showcase). Cached per request. */
export const isConstructionProjectForProgression = cache(loadIsConstructionProject);

async function loadIsConstructionProject(projectId: string): Promise<boolean> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("projects")
      .select("id, client:clients(dashboard_type)")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!data) return false;
    const client = data.client as { dashboard_type: string | null } | null;
    return (client?.dashboard_type ?? "construction") === "construction";
  } catch {
    return false;
  }
}

type TemplateStepSeed = { id: string; step_number: number };

async function getActiveTemplateSteps(
  track: ProgressionTrack = "post_slab",
  method: ConstructionMethod = "conventional"
): Promise<{
  templateId: string;
  steps: TemplateStepSeed[];
} | null> {
  const admin = createServiceRoleClient();
  let { data: template } = await admin
    .from("progression_templates")
    .select("id")
    .eq("key", templateKeyFor(method, track))
    .eq("is_active", true)
    .maybeSingle();
  if (!template?.id && method !== "conventional") {
    // Method templates arrive with migration 053; fall back until then.
    ({ data: template } = await admin
      .from("progression_templates")
      .select("id")
      .eq("key", PROGRESSION_TEMPLATE_KEYS[track])
      .eq("is_active", true)
      .maybeSingle());
  }

  if (!template?.id) {
    console.warn(
      `[progression] active template missing for ${track} — apply migrations 032/036`
    );
    return null;
  }

  const { data: templateSteps, error } = await admin
    .from("progression_template_steps")
    .select("id, step_number")
    .eq("template_id", template.id)
    .order("step_number", { ascending: true });

  if (error || !templateSteps?.length) {
    console.warn("[progression] template steps missing:", error?.message);
    return null;
  }

  return { templateId: template.id, steps: templateSteps };
}

export type ProjectMethods = {
  project: ConstructionMethod;
  /** Building's own setting (null = inherits the project). */
  buildings: Map<string, ConstructionMethod | null>;
  /** Floor's own setting (null = inherits the building). */
  floorsOwn: Map<string, ConstructionMethod | null>;
  /** Effective method per floor. */
  floors: Map<string, ConstructionMethod>;
};

/** Construction method settings for a project (conventional before migration 053). */
export async function getProjectMethods(projectId: string): Promise<ProjectMethods> {
  const admin = createServiceRoleClient();
  const [{ data: project }, { data: buildings }] = await Promise.all([
    admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
    admin.from("buildings").select("*").eq("project_id", projectId).is("deleted_at", null),
  ]);
  const buildingRows = (buildings ?? []) as Array<{ id: string; construction_method?: string | null }>;
  const { data: floors } = buildingRows.length
    ? await admin
        .from("floors")
        .select("*")
        .in("building_id", buildingRows.map((b) => b.id))
        .is("deleted_at", null)
    : { data: [] };
  const projectMethod = effectiveMethod(
    null,
    null,
    (project as { construction_method?: string | null } | null)?.construction_method
  );
  const own = (v: string | null | undefined) => (isConstructionMethod(v) ? v : null);
  const buildingMap = new Map(buildingRows.map((b) => [b.id, own(b.construction_method)]));
  const floorsOwn = new Map<string, ConstructionMethod | null>();
  const effective = new Map<string, ConstructionMethod>();
  for (const f of (floors ?? []) as Array<{ id: string; building_id: string; construction_method?: string | null }>) {
    floorsOwn.set(f.id, own(f.construction_method));
    effective.set(f.id, effectiveMethod(f.construction_method, buildingMap.get(f.building_id), projectMethod));
  }
  return { project: projectMethod, buildings: buildingMap, floorsOwn, floors: effective };
}

/** Create progression + pending steps for one floor + track (idempotent). */
export async function ensureFloorProgression(
  projectId: string,
  floorId: string,
  buildingId: string,
  actorId?: string | null,
  track: ProgressionTrack = "post_slab",
  method?: ConstructionMethod
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("project_progressions")
    .select("id")
    .eq("floor_id", floorId)
    .eq("track", track)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // v2 projects: create every missing checklist (floors, buildings, site) from
  // the v2 lists in one database call, then return this floor's.
  if ((await getProgressionVersion(projectId)) === 2) {
    await admin.rpc("reconcile_progression_v2" as never, { p_project: projectId, p_actor: actorId ?? null } as never);
    const { data: created } = await admin
      .from("project_progressions")
      .select("id")
      .eq("floor_id", floorId)
      .eq("track", track)
      .is("deleted_at", null)
      .maybeSingle();
    return (created?.id as string | undefined) ?? null;
  }

  const floorMethod =
    method ?? (await getProjectMethods(projectId)).floors.get(floorId) ?? "conventional";
  const template = await getActiveTemplateSteps(track, floorMethod);
  if (!template) return null;

  const { data: created, error: createError } = await admin
    .from("project_progressions")
    .insert({
      project_id: projectId,
      floor_id: floorId,
      building_id: buildingId,
      template_id: template.templateId,
      track,
      created_by: actorId ?? null,
      updated_by: actorId ?? null,
    })
    .select("id")
    .single();

  if (createError) {
    const { data: raced } = await admin
      .from("project_progressions")
      .select("id")
      .eq("floor_id", floorId)
      .eq("track", track)
      .is("deleted_at", null)
      .maybeSingle();
    if (raced?.id) return raced.id;
    console.warn("[progression] create floor failed:", createError.message);
    return null;
  }

  const rows = template.steps.map((step) => ({
    progression_id: created.id,
    template_step_id: step.id,
    step_number: step.step_number,
    status: "pending" as const,
  }));

  const { error: insertStepsError } = await admin.from("project_progression_steps").insert(rows);
  if (insertStepsError) {
    console.warn("[progression] floor step seed failed:", insertStepsError.message);
  }

  return created.id;
}

/**
 * Ensure every active floor on the project has a progression row.
 * Only creates missing rows (skips floors that already have a checklist).
 */
async function ensureProjectFloorProgressions(
  projectId: string,
  actorId: string
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: buildings } = await admin
    .from("buildings")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const buildingIds = (buildings ?? []).map((b) => b.id);
  if (buildingIds.length === 0) return;

  const [{ data: floors }, { data: existing }] = await Promise.all([
    admin
      .from("floors")
      .select("id, building_id")
      .in("building_id", buildingIds)
      .is("deleted_at", null),
    admin
      .from("project_progressions")
      .select("floor_id, track")
      .eq("project_id", projectId)
      .is("deleted_at", null),
  ]);

  const have = new Set(
    (existing ?? []).map((p) => `${p.floor_id as string}:${p.track as string}`)
  );
  const methods = await getProjectMethods(projectId);
  for (const floor of floors ?? []) {
    for (const track of PROGRESSION_TRACKS) {
      if (have.has(`${floor.id}:${track}`)) continue;
      await ensureFloorProgression(
        projectId,
        floor.id,
        floor.building_id,
        actorId,
        track,
        methods.floors.get(floor.id) ?? "conventional"
      );
    }
  }
}

function mapSteps(
  rows: Array<{
    id: string;
    template_step_id: string;
    step_number: number;
    status: string;
    started_at?: string | null;
    started_by?: string | null;
    ended_at?: string | null;
    ended_by?: string | null;
    completed_at: string | null;
    completed_by: string | null;
    work_date: string | null;
    note: string | null;
    evidence_tour_id?: string | null;
    evidence_note?: string | null;
    verification_status?: string | null;
    verified_at?: string | null;
    verification_note?: string | null;
    source?: string | null;
    template_step: {
      phase_number: number;
      phase_name: string;
      phase_stage: string;
      title: string;
    } | null;
    started_by_user?: { full_name: string | null } | null;
    ended_by_user?: { full_name: string | null } | null;
    completed_by_user: { full_name: string | null } | null;
  }>
): ProgressionStepView[] {
  return rows
    .map((row) => {
      const tpl = row.template_step;
      if (!tpl) return null;
      const status =
        row.status === "completed"
          ? ("completed" as const)
          : row.status === "in_progress"
            ? ("in_progress" as const)
            : ("pending" as const);
      return {
        id: row.id,
        templateStepId: row.template_step_id,
        stepNumber: row.step_number,
        phaseNumber: tpl.phase_number,
        phaseName: tpl.phase_name,
        phaseStage: tpl.phase_stage,
        title: tpl.title,
        status,
        startedAt: row.started_at ?? null,
        startedBy: row.started_by ?? null,
        startedByName: row.started_by_user?.full_name ?? null,
        endedAt: row.ended_at ?? row.completed_at ?? null,
        endedBy: row.ended_by ?? row.completed_by ?? null,
        endedByName:
          row.ended_by_user?.full_name ?? row.completed_by_user?.full_name ?? null,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        completedByName: row.completed_by_user?.full_name ?? null,
        workDate: row.work_date,
        note: row.note,
        evidenceTourId: row.evidence_tour_id ?? null,
        evidenceNote: row.evidence_note ?? null,
        verificationStatus:
          row.verification_status === "verified" || row.verification_status === "rejected"
            ? (row.verification_status as "verified" | "rejected")
            : null,
        verifiedAt: row.verified_at ?? null,
        verifiedByName: null as string | null,
        verificationNote: row.verification_note ?? null,
        source: row.source === "ai" ? ("ai" as const) : ("manual" as const),
      };
    })
    .filter((s): s is ProgressionStepView => s != null)
    .sort((a, b) => a.stepNumber - b.stepNumber);
}

/** Checklist rows for one physical floor, shaped for the completion formula. */
function checklistFloors(
  floors: FloorProgressionSummary[],
  zoneFloorPercents: Record<string, number> = {}
): ChecklistFloorInput[] {
  const byFloor = new Map<string, ChecklistFloorInput>();
  for (const row of floors) {
    const entry = byFloor.get(row.floorId) ?? {
      floorId: row.floorId,
      tracks: [],
      zoneActual: zoneFloorPercents[row.floorId] ?? null,
    };
    entry.tracks.push({
      completed: row.completedCount,
      total: row.totalCount,
      plannedStart: row.plannedStartDate,
      plannedEnd: row.plannedEndDate,
    });
    byFloor.set(row.floorId, entry);
  }
  return [...byFloor.values()];
}

/**
 * Project % via the Definable Completion formula: every floor counts, floors
 * that have not started count as 0% (decision 24 Nov 2026).
 */
function aggregateProjectPercent(
  floors: FloorProgressionSummary[],
  combinedFloors: CombinedFloorSummary[],
  zoneFloorPercents: Record<string, number> = {},
  zoneFloorPlannedPercents: Record<string, number> = {}
): {
  overallPercent: number;
  activatedFloorCount: number;
  completion: ProjectCompletion;
} {
  const completion = projectCompletion(
    checklistFloors(floors, zoneFloorPercents).map((f) => ({
      ...f,
      zonePlanned: zoneFloorPlannedPercents[f.floorId] ?? null,
    })),
    todayInIndia()
  );
  return {
    overallPercent: Math.round(completion.actual),
    activatedFloorCount: combinedFloors.filter((f) => f.activated).length,
    completion,
  };
}

function summarizeTracks(
  floors: FloorProgressionSummary[],
  combinedFloors: CombinedFloorSummary[]
): TrackProgressionSummary[] {
  // Every floor counts (unstarted floors contribute 0 completed steps).
  void combinedFloors;
  return PROGRESSION_TRACKS.map((track) => {
    let completed = 0;
    let inProgress = 0;
    let total = 0;
    for (const floor of floors) {
      if (floor.track !== track) continue;
      completed += floor.completedCount;
      inProgress += floor.inProgressCount;
      total += floor.totalCount;
    }
    return {
      track,
      percent: overallPercent(completed, total),
      completedCount: completed,
      inProgressCount: inProgress,
      totalCount: total,
    };
  });
}

type FloorSummariesResult = {
  floors: FloorProgressionSummary[];
  combinedFloors: CombinedFloorSummary[];
  pendingReviewCount?: number;
  /** "floorId:track" for every checklist that exists. */
  existing?: Set<string>;
};

/** Project switch: only verified steps count (migration 047). False before 047. */
async function getVerifiedOnly(projectId: string): Promise<boolean> {
  const { data } = await createServiceRoleClient()
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  return (data as { progress_verified_only?: boolean } | null)?.progress_verified_only === true;
}

/** A step counts toward % when ended, and (if required) verified. */
function stepCounts(
  status: string,
  verification: string | null | undefined,
  verifiedOnly: boolean
): boolean {
  return status === "completed" && (!verifiedOnly || verification === "verified");
}

async function loadFloorSummaries(
  projectId: string,
  verifiedOnly = false
): Promise<FloorSummariesResult> {
  const admin = createServiceRoleClient();

  const { data: buildings } = await admin
    .from("buildings")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!buildings?.length) return { floors: [], combinedFloors: [], pendingReviewCount: 0 };

  const buildingIds = buildings.map((b) => b.id);
  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  const { data: floors } = await admin
    .from("floors")
    .select("id, building_id, name, sort_order")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!floors?.length) return { floors: [], combinedFloors: [], pendingReviewCount: 0 };

  const { data: progressions } = await admin
    .from("project_progressions")
    .select("id, floor_id, track, planned_start_date, planned_end_date")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const progressionByFloorTrack = new Map(
    (progressions ?? []).map((p) => [
      `${p.floor_id as string}:${p.track as string}`,
      p.id as string,
    ])
  );
  const plannedByFloorTrack = new Map(
    (progressions ?? []).map((p) => [
      `${p.floor_id as string}:${p.track as string}`,
      {
        plannedStartDate: (p.planned_start_date as string | null) ?? null,
        plannedEndDate: (p.planned_end_date as string | null) ?? null,
      },
    ])
  );
  const progressionIds = (progressions ?? []).map((p) => p.id);
  const floorMethods = (await getProjectMethods(projectId)).floors;
  const countsByProgression = new Map<
    string,
    { completed: number; inProgress: number; total: number; awaitingReview: number }
  >();

  if (progressionIds.length > 0) {
    // "*" so this works before and after migration 047 (verification_status).
    const { data: steps } = await fetchAllRows((a, b) =>
      admin
        .from("project_progression_steps")
        .select("id, progression_id, status, verification_status")
        .in("progression_id", progressionIds)
        .order("id")
        .range(a, b)
    );

    for (const step of (steps ?? []) as unknown as Array<{
      progression_id: string;
      status: string;
      verification_status?: string | null;
    }>) {
      const row = countsByProgression.get(step.progression_id) ?? {
        completed: 0,
        inProgress: 0,
        total: 0,
        awaitingReview: 0,
      };
      row.total += 1;
      if (stepCounts(step.status, step.verification_status, verifiedOnly)) row.completed += 1;
      else if (step.status === "completed") row.inProgress += 1;
      if (step.status === "in_progress") row.inProgress += 1;
      if (step.status === "completed" && step.verification_status !== "verified") {
        row.awaitingReview += 1;
      }
      countsByProgression.set(step.progression_id, row);
    }
  }

  // A physical floor is activated once any step in either track has started.
  const activatedByFloor = new Map<string, boolean>();
  for (const floor of floors) {
    let activated = false;
    for (const track of PROGRESSION_TRACKS) {
      const progressionId = progressionByFloorTrack.get(`${floor.id}:${track}`);
      const counts = progressionId ? countsByProgression.get(progressionId) : undefined;
      if (counts && counts.completed + counts.inProgress > 0) activated = true;
    }
    activatedByFloor.set(floor.id, activated);
  }

  const trackSummaries: FloorProgressionSummary[] = [];
  const combinedFloors: CombinedFloorSummary[] = [];
  let pendingReviewCount = 0;

  for (const floor of floors) {
    const activated = activatedByFloor.get(floor.id) ?? false;
    let pooledCompleted = 0;
    let pooledInProgress = 0;
    let pooledTotal = 0;
    for (const track of PROGRESSION_TRACKS) {
      const progressionId = progressionByFloorTrack.get(`${floor.id}:${track}`);
      const counts = progressionId
        ? countsByProgression.get(progressionId) ??
          { completed: 0, inProgress: 0, total: 0, awaitingReview: 0 }
        : { completed: 0, inProgress: 0, total: 0, awaitingReview: 0 };
      pendingReviewCount += counts.awaitingReview;
      pooledCompleted += counts.completed;
      pooledInProgress += counts.inProgress;
      pooledTotal += counts.total;
      const planned = plannedByFloorTrack.get(`${floor.id}:${track}`);
      trackSummaries.push({
        track,
        floorId: floor.id,
        buildingId: floor.building_id,
        buildingName: buildingNameById.get(floor.building_id) ?? "Building",
        floorName: floor.name,
        completedCount: counts.completed,
        inProgressCount: counts.inProgress,
        totalCount: counts.total,
        percent: overallPercent(counts.completed, counts.total),
        plannedStartDate: planned?.plannedStartDate ?? null,
        plannedEndDate: planned?.plannedEndDate ?? null,
        activated,
        method: floorMethods.get(floor.id) ?? "conventional",
      });
    }
    combinedFloors.push({
      floorId: floor.id,
      buildingId: floor.building_id,
      buildingName: buildingNameById.get(floor.building_id) ?? "Building",
      floorName: floor.name,
      completedCount: pooledCompleted,
      inProgressCount: pooledInProgress,
      totalCount: pooledTotal,
      percent: overallPercent(pooledCompleted, pooledTotal),
      activated,
      method: floorMethods.get(floor.id) ?? "conventional",
    });
  }

  return {
    floors: trackSummaries,
    combinedFloors,
    pendingReviewCount,
    existing: new Set(progressionByFloorTrack.keys()),
  };
}

async function loadFloorDetail(
  projectId: string,
  floorId: string,
  track: ProgressionTrack,
  actor: Actor,
  meta: { buildingId: string; buildingName: string; floorName: string },
  verifiedOnly = false
): Promise<ProjectProgressionView | null> {
  const progressionId = await ensureFloorProgression(
    projectId,
    floorId,
    meta.buildingId,
    actor.id,
    track
  );
  if (!progressionId) return null;

  const admin = createServiceRoleClient();
  const [stepsRes, logsRes, templateRes] = await Promise.all([
    admin
      .from("project_progression_steps")
      .select(
        "*, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title), started_by_user:users!project_progression_steps_started_by_fkey(full_name), ended_by_user:users!project_progression_steps_ended_by_fkey(full_name), completed_by_user:users!project_progression_steps_completed_by_fkey(full_name)"
      )
      .eq("progression_id", progressionId)
      .order("step_number", { ascending: true }),
    admin
      .from("project_progression_logs")
      .select("action, work_date")
      .eq("progression_id", progressionId)
      .order("work_date", { ascending: false })
      .limit(500),
    admin
      .from("project_progressions")
      .select("id, planned_start_date, planned_end_date, template:progression_templates(key)")
      .eq("id", progressionId)
      .maybeSingle(),
  ]);

  let steps: ProgressionStepView[];
  if (stepsRes.error) {
    const plain = await admin
      .from("project_progression_steps")
      .select(
        "*, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title)"
      )
      .eq("progression_id", progressionId)
      .order("step_number", { ascending: true });

    if (plain.error) {
      console.warn("[getProjectProgression] steps:", plain.error.message);
      return null;
    }

    steps = mapSteps(
      (plain.data ?? []).map((row) => ({
        ...(row as Omit<(typeof plain.data)[number], never>),
        completed_by_user: null,
      })) as unknown as Parameters<typeof mapSteps>[0]
    );
  } else {
    steps = mapSteps((stepsRes.data ?? []) as unknown as Parameters<typeof mapSteps>[0]);
  }

  // Verifier names (looked up separately so this works before migration 047).
  const verifierIds = [
    ...new Set(
      ((stepsRes.data ?? []) as Array<{ verified_by?: string | null }>)
        .map((r) => r.verified_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (verifierIds.length > 0) {
    const { data: users } = await admin.from("users").select("id, full_name").in("id", verifierIds);
    const nameById = new Map((users ?? []).map((u) => [u.id as string, u.full_name as string | null]));
    const verifiedByStep = new Map(
      ((stepsRes.data ?? []) as Array<{ id: string; verified_by?: string | null }>).map((r) => [
        r.id,
        r.verified_by ?? null,
      ])
    );
    steps = steps.map((s) => {
      const by = verifiedByStep.get(s.id);
      return by ? { ...s, verifiedByName: nameById.get(by) ?? null } : s;
    });
  }

  const completedCount = steps.filter((s) =>
    stepCounts(s.status, s.verificationStatus, verifiedOnly)
  ).length;
  const inProgressCount = steps.filter(
    (s) => s.status === "in_progress" || (s.status === "completed" && !stepCounts(s.status, s.verificationStatus, verifiedOnly))
  ).length;
  const totalCount = steps.length;
  const logs = (logsRes.data ?? []) as Array<{ action: string; work_date: string }>;
  const templateKey =
    (templateRes.data?.template as { key: string } | null)?.key ??
    PROGRESSION_TEMPLATE_KEYS[track];

  return {
    id: progressionId,
    projectId,
    track,
    floorId,
    buildingId: meta.buildingId,
    buildingName: meta.buildingName,
    floorName: meta.floorName,
    templateKey,
    method: methodOfTemplateKey(templateKey),
    plannedStartDate:
      (templateRes.data?.planned_start_date as string | null | undefined) ?? null,
    plannedEndDate:
      (templateRes.data?.planned_end_date as string | null | undefined) ?? null,
    overallPercent: overallPercent(completedCount, totalCount),
    completedCount,
    inProgressCount,
    totalCount,
    activated: completedCount + inProgressCount > 0,
    phases: buildPhases(steps),
    daily: buildDailySeries(logs, 14),
    weekly: buildWeeklySeries(logs, 8),
    canEdit: canEditProgression(actor.role),
  };
}

export type ProgressionFloorSelections = {
  preFloorId?: string | null;
  postFloorId?: string | null;
};

function normalizeSelections(
  input?: string | ProgressionFloorSelections | null
): ProgressionFloorSelections {
  if (!input) return {};
  if (typeof input === "string") return { postFloorId: input };
  return input;
}

function pickDefaultFloorId(
  floors: CombinedFloorSummary[],
  preferredFloorId?: string | null
): { floorId: string | null; unknownPreferred: boolean } {
  if (preferredFloorId) {
    if (floors.some((f) => f.floorId === preferredFloorId)) {
      return { floorId: preferredFloorId, unknownPreferred: false };
    }
    return { floorId: null, unknownPreferred: true };
  }
  // Stay on the first floor in structure order — never auto-jump to an unfinished floor.
  return { floorId: floors[0]?.floorId ?? null, unknownPreferred: false };
}

async function loadProjectProgressionBundle(
  projectId: string,
  actor: Actor,
  selections?: string | ProgressionFloorSelections | null,
  options?: { ensureMissing?: boolean }
): Promise<ProjectProgressionBundle | null> {
  if (!(await assertProgressionReadable(projectId, actor))) return null;
  if (!(await isConstructionProjectForProgression(projectId))) return null;

  // Full-project seed is opt-in (admin create / repair). Reads ensure selected floors only.
  if (options?.ensureMissing === true) {
    try {
      await ensureProjectFloorProgressions(projectId, actor.id);
    } catch (err) {
      console.warn("[getProjectProgression] ensure floors failed:", err);
    }
  }

  const verifiedOnly = await getVerifiedOnly(projectId);
  const admin = createServiceRoleClient();
  // Independent of the summaries: start now, await later.
  const toursPromise = admin
    .from("project_tours")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const zonePromise = loadZoneData([projectId]).catch(() => new Map());
  const firstSummaries = await loadFloorSummaries(projectId, verifiedOnly);
  const { combinedFloors } = firstSummaries;
  const canEdit = canEditProgression(actor.role);
  const wanted = normalizeSelections(selections);

  const prePick = pickDefaultFloorId(combinedFloors, wanted.preFloorId);
  const postPick = pickDefaultFloorId(combinedFloors, wanted.postFloorId);
  if (prePick.unknownPreferred || postPick.unknownPreferred) return null;

  const loadFor = (track: ProgressionTrack, floorId: string | null) => {
    if (!floorId) return Promise.resolve(null);
    const meta = combinedFloors.find((f) => f.floorId === floorId)!;
    return loadFloorDetail(
      projectId,
      floorId,
      track,
      actor,
      {
        buildingId: meta.buildingId,
        buildingName: meta.buildingName,
        floorName: meta.floorName,
      },
      verifiedOnly
    );
  };

  const [preSelected, postSelected] = await Promise.all([
    loadFor("pre_slab", prePick.floorId),
    loadFor("post_slab", postPick.floorId),
  ]);

  // Details seed a missing checklist; only then re-read the summaries.
  const seeded =
    (prePick.floorId && !firstSummaries.existing?.has(`${prePick.floorId}:pre_slab`)) ||
    (postPick.floorId && !firstSummaries.existing?.has(`${postPick.floorId}:post_slab`));
  const refreshed = seeded ? await loadFloorSummaries(projectId, verifiedOnly) : firstSummaries;
  const { data: tourRows } = await toursPromise;
  const scans: ProgressionScan[] = ((tourRows ?? []) as Array<{
    id: string;
    name: string;
    capture_date: string | null;
    created_at: string;
    floor_id?: string | null;
    matterport_url: string;
    archived_at?: string | null;
  }>)
    .filter((t) => !t.archived_at)
    .map((t) => ({
      id: t.id,
      name: t.name,
      captureDate: t.capture_date,
      createdAt: t.created_at,
      floorId: t.floor_id ?? null,
      matterportUrl: t.matterport_url,
    }))
    .sort((a, b) => (b.captureDate ?? b.createdAt).localeCompare(a.captureDate ?? a.createdAt));
  const zoneDataForProject = (await zonePromise).get(projectId);
  const zoneResults = zoneFloorResults(zoneDataForProject, todayInIndia(), verifiedOnly);
  const zoneFloorPercents: Record<string, number> = {};
  for (const [floorId, r] of zoneResults) zoneFloorPercents[floorId] = r.percent;
  const zoneFloorPlannedPercents: Record<string, number> = {};
  for (const [floorId, p] of zoneFloorPlanned(zoneDataForProject, todayInIndia())) {
    zoneFloorPlannedPercents[floorId] = p;
  }
  const v1 = aggregateProjectPercent(
    refreshed.floors,
    refreshed.combinedFloors,
    zoneFloorPercents,
    zoneFloorPlannedPercents
  );
  const { overallPercent: overall, activatedFloorCount } = v1;
  let completion: ProjectCompletion | V2Result = v1.completion;
  // Progression v2: weighted phases and the Inside / Outside / Site split.
  const v2Data = (await getProgressionVersion(projectId)) === 2 ? await loadV2ProjectData(projectId) : null;
  if (v2Data) {
    completion = v2CompletionFor(v2Data, todayInIndia(), {
      zoneActual: new Map(Object.entries(zoneFloorPercents)),
      zonePlanned: new Map(Object.entries(zoneFloorPlannedPercents)),
    });
  }
  await writeCompletionSnapshot(projectId, completion, verifiedOnly);

  return {
    projectId,
    overallPercent: overall,
    floorCount: refreshed.combinedFloors.length,
    activatedFloorCount,
    completion,
    progressionVersion: v2Data ? 2 : 1,
    verifiedOnly,
    canVerify: canVerifyProgression(actor.role),
    pendingReviewCount: refreshed.pendingReviewCount ?? 0,
    scans,
    zoneFloorPercents,
    zoneFloorPlannedPercents,
    floors: refreshed.floors,
    combinedFloors: refreshed.combinedFloors,
    tracks: summarizeTracks(refreshed.floors, refreshed.combinedFloors),
    constructionMethod: (await getProjectMethods(projectId)).project,
    methodsInUse: [...new Set(refreshed.combinedFloors.map((f) => f.method))],
    selectedByTrack: { pre_slab: preSelected, post_slab: postSelected },
    selected: postSelected,
    canEdit,
  };
}

const getProjectProgressionCached = cache(
  async (
    projectId: string,
    preFloorId: string | null,
    postFloorId: string | null
  ) => {
    const actor = await getProgressionActor();
    if (!actor) return null;
    return loadProjectProgressionBundle(
      projectId,
      actor,
      { preFloorId, postFloorId },
      { ensureMissing: false }
    );
  }
);

/**
 * Load Progression Report bundle for a construction project.
 * Selections pick the floor shown in each track section (legacy string = Post-Slab).
 */
export async function getProjectProgression(
  projectId: string,
  selections?: string | ProgressionFloorSelections | null
) {
  if (!validate(projectIdSchema, projectId).success) return null;
  const wanted = normalizeSelections(selections);
  if (wanted.preFloorId && !validate(uuid("Floor"), wanted.preFloorId).success) return null;
  if (wanted.postFloorId && !validate(uuid("Floor"), wanted.postFloorId).success) return null;
  return getProjectProgressionCached(
    projectId,
    wanted.preFloorId ?? null,
    wanted.postFloorId ?? null
  );
}

/**
 * Fresh read after a mutation / floor switch (bypasses React cache()).
 */
export async function getProjectProgressionFresh(
  projectId: string,
  selections?: string | ProgressionFloorSelections | null,
  options?: { ensureMissing?: boolean }
) {
  if (!validate(projectIdSchema, projectId).success) return null;
  const wanted = normalizeSelections(selections);
  if (wanted.preFloorId && !validate(uuid("Floor"), wanted.preFloorId).success) return null;
  if (wanted.postFloorId && !validate(uuid("Floor"), wanted.postFloorId).success) return null;
  const actor = await getProgressionActor();
  if (!actor) return null;
  return loadProjectProgressionBundle(projectId, actor, wanted, {
    ensureMissing: options?.ensureMissing ?? false,
  });
}

/**
 * Project % for many projects via the completion formula: every floor of the
 * project counts, floors that have not started (or have no checklist yet) = 0%.
 */
export async function getProgressionPercentByProjectIds(
  projectIds: string[]
): Promise<Map<string, number>> {
  const result = await v1PercentByProjectIds(projectIds);
  // Progression v2 projects: weighted phases + Inside / Outside / Site split.
  try {
    const ids = projectIds.filter((id) => validate(projectIdSchema, id).success);
    if (ids.length === 0) return result;
    const { data: rows } = await createServiceRoleClient().from("projects").select("*").in("id", ids);
    const v2Ids = ((rows ?? []) as Array<{ id: string; progression_version?: number }>)
      .filter((r) => Number(r.progression_version ?? 1) === 2)
      .map((r) => r.id);
    if (v2Ids.length === 0) return result;
    const today = todayInIndia();
    const zoneData = await loadZoneData(v2Ids).catch(() => new Map());
    for (const id of v2Ids) {
      const data = await loadV2ProjectData(id);
      if (!data) continue;
      const zones = new Map<string, number>();
      for (const [floorId, r] of zoneFloorResults(zoneData.get(id), today, data.verifiedOnly)) zones.set(floorId, r.percent);
      result.set(id, Math.round(v2CompletionFor(data, today, { zoneActual: zones }).actual));
    }
  } catch (err) {
    console.warn("[getProgressionPercentByProjectIds] v2 failed:", err);
  }
  return result;
}

async function v1PercentByProjectIds(projectIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const ids = projectIds.filter((id) => validate(projectIdSchema, id).success);
  if (ids.length === 0) return result;

  try {
    const admin = createServiceRoleClient();
    const { data: progressions, error } = await admin
      .from("project_progressions")
      .select("id, project_id, floor_id")
      .in("project_id", ids)
      .is("deleted_at", null);

    if (error || !progressions?.length) return result;

    // Every physical floor of these projects, so floors without ticks count as 0%.
    const { data: buildingRows } = await admin
      .from("buildings")
      .select("id, project_id")
      .in("project_id", ids)
      .is("deleted_at", null);
    const projectByBuilding = new Map(
      (buildingRows ?? []).map((b) => [b.id as string, b.project_id as string])
    );
    const { data: floorRows } = projectByBuilding.size
      ? await admin
          .from("floors")
          .select("id, building_id")
          .in("building_id", [...projectByBuilding.keys()])
          .is("deleted_at", null)
      : { data: [] as { id: string; building_id: string }[] };

    const progressionIds = progressions.map((p) => p.id);
    const [{ data: steps, error: stepsError }, { data: projectRows }] = await Promise.all([
      fetchAllRows((a, b) =>
        admin
          .from("project_progression_steps")
          .select("*")
          .in("progression_id", progressionIds)
          .order("id")
          .range(a, b)
      ),
      admin.from("projects").select("*").in("id", ids),
    ]);
    const verifiedOnlyProjects = new Set(
      ((projectRows ?? []) as Array<{ id: string; progress_verified_only?: boolean }>)
        .filter((p) => p.progress_verified_only === true)
        .map((p) => p.id)
    );
    const projectByProgression = new Map(
      progressions.map((p) => [p.id as string, p.project_id as string])
    );

    if (stepsError || !steps) return result;

    const totals = new Map<
      string,
      { completed: number; started: number; total: number }
    >();
    for (const step of steps) {
      const row = totals.get(step.progression_id) ?? { completed: 0, started: 0, total: 0 };
      row.total += 1;
      const verifiedOnly = verifiedOnlyProjects.has(projectByProgression.get(step.progression_id) ?? "");
      if (stepCounts(step.status, (step as { verification_status?: string | null }).verification_status, verifiedOnly)) {
        row.completed += 1;
      }
      if (step.status === "completed" || step.status === "in_progress") row.started += 1;
      totals.set(step.progression_id, row);
    }

    // Pool both tracks per physical floor; a floor counts once any step has Started.
    const byFloor = new Map<
      string,
      { projectId: string; completed: number; started: number; total: number }
    >();
    for (const progression of progressions) {
      const counts = totals.get(progression.id);
      if (!counts || counts.total === 0) continue;
      const key = `${progression.project_id}:${progression.floor_id}`;
      const agg = byFloor.get(key) ?? {
        projectId: progression.project_id as string,
        completed: 0,
        started: 0,
        total: 0,
      };
      agg.completed += counts.completed;
      agg.started += counts.started;
      agg.total += counts.total;
      byFloor.set(key, agg);
    }

    // Only projects that use Progression get a %; others keep their fallback.
    const trackedProjects = new Set(progressions.map((p) => p.project_id as string));
    const floorsByProject = new Map<string, ChecklistFloorInput[]>();
    for (const floor of floorRows ?? []) {
      const projectId = projectByBuilding.get(floor.building_id as string);
      if (!projectId || !trackedProjects.has(projectId)) continue;
      const counts = byFloor.get(`${projectId}:${floor.id as string}`);
      const list = floorsByProject.get(projectId) ?? [];
      list.push({
        floorId: floor.id as string,
        tracks: [
          {
            completed: counts?.completed ?? 0,
            total: counts?.total ?? 0,
            plannedStart: null,
            plannedEnd: null,
          },
        ],
      });
      floorsByProject.set(projectId, list);
    }

    const today = todayInIndia();
    const zoneData = await loadZoneData([...floorsByProject.keys()]).catch(() => new Map());
    for (const [projectId, floorInputs] of floorsByProject) {
      const zoneFloors = zoneFloorResults(
        zoneData.get(projectId),
        today,
        verifiedOnlyProjects.has(projectId)
      );
      const withZones = floorInputs.map((f) => ({
        ...f,
        zoneActual: zoneFloors.get(f.floorId)?.percent ?? null,
      }));
      result.set(projectId, Math.round(projectCompletion(withZones, today).actual));
    }
  } catch (err) {
    console.warn("[getProgressionPercentByProjectIds] failed:", err);
  }

  return result;
}

/**
 * Every checklist step on the project with the day it was ended, for
 * "progress at this scan". Null when the viewer can't see Progression or the
 * project isn't a Construction Intelligence project. Floors without checklist
 * rows are returned in `floorIds` so they count as 0%.
 */
export const getChecklistStepRecords = cache(
  async (
    projectId: string
  ): Promise<{ floorIds: string[]; steps: ChecklistStepRecord[] } | null> => {
    if (!validate(projectIdSchema, projectId).success) return null;
    const actor = await getProgressionActor();
    if (!actor || !(await assertProgressionReadable(projectId, actor))) return null;
    if (!(await isConstructionProjectForProgression(projectId))) return null;

    const admin = createServiceRoleClient();
    const { data: buildings } = await admin
      .from("buildings")
      .select("id, name")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    if (!buildings?.length) return { floorIds: [], steps: [] };
    const buildingName = new Map(buildings.map((b) => [b.id as string, b.name as string]));

    const { data: floors } = await admin
      .from("floors")
      .select("id, name, building_id")
      .in("building_id", [...buildingName.keys()])
      .is("deleted_at", null);
    const floorMeta = new Map(
      (floors ?? []).map((f) => [
        f.id as string,
        { name: f.name as string, building: buildingName.get(f.building_id as string) ?? "Building" },
      ])
    );

    const verifiedOnly = await getVerifiedOnly(projectId);
    const { data: progressions } = await admin
      .from("project_progressions")
      .select("id, floor_id, track")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    const progressionMeta = new Map(
      (progressions ?? []).map((p) => [p.id as string, { floorId: p.floor_id as string, track: p.track as string }])
    );

    const steps: ChecklistStepRecord[] = [];
    if (progressionMeta.size > 0) {
      const progressionIdList = [...progressionMeta.keys()];
      const { data: rows } = await fetchAllRows((a, b) =>
        admin
          .from("project_progression_steps")
          .select("*, template_step:progression_template_steps(title)")
          .in("progression_id", progressionIdList)
          .order("id")
          .range(a, b)
      );
      for (const row of rows ?? []) {
        const meta = progressionMeta.get(row.progression_id as string);
        if (!meta) continue;
        const floor = floorMeta.get(meta.floorId);
        if (!floor) continue;
        const ended =
          (row.work_date as string | null) ??
          ((row.ended_at as string | null) ?? (row.completed_at as string | null))?.slice(0, 10) ??
          null;
        steps.push({
          floorId: meta.floorId,
          floorName: floor.name,
          buildingName: floor.building,
          track: meta.track,
          stepNumber: row.step_number as number,
          title:
            (row.template_step as unknown as { title: string } | null)?.title ?? `Step ${row.step_number}`,
          // With "only verified" on, an unverified ended step doesn't count yet.
          status: stepCounts(
            row.status as string,
            (row as { verification_status?: string | null }).verification_status,
            verifiedOnly
          )
            ? "completed"
            : row.status === "pending"
              ? "pending"
              : "in_progress",
          doneDate: stepCounts(
            row.status as string,
            (row as { verification_status?: string | null }).verification_status,
            verifiedOnly
          )
            ? ended
            : null,
        });
      }
    }

    return { floorIds: [...floorMeta.keys()], steps };
  }
);

export type ScanChecklistPercent = { percent: number; scope: "floor" | "project" };

/**
 * Checklist % on each tour's capture date: the tour's floor when it has one
 * with a checklist, otherwise the whole project. Tours the viewer can't see
 * Progression for are omitted.
 */
export async function getChecklistPercentByTour(
  tours: { id: string; project_id: string; floor_id?: string | null; capture_date: string | null; created_at: string }[]
): Promise<Record<string, ScanChecklistPercent>> {
  const result: Record<string, ScanChecklistPercent> = {};
  const projectIds = [...new Set(tours.map((t) => t.project_id))];
  const recordsByProject = new Map(
    await Promise.all(
      projectIds.map(async (id) => [id, await getChecklistStepRecords(id).catch(() => null)] as const)
    )
  );
  for (const tour of tours) {
    const records = recordsByProject.get(tour.project_id);
    if (!records || records.steps.length === 0) continue;
    const date = (tour.capture_date ?? tour.created_at).slice(0, 10);
    const onFloor = tour.floor_id && records.floorIds.includes(tour.floor_id);
    result[tour.id] = {
      percent: percentOnDate(records.steps, onFloor ? [tour.floor_id as string] : records.floorIds, date),
      scope: onFloor ? "floor" : "project",
    };
  }
  return result;
}

export type CompletionHistory = {
  points: SCurvePoint[];
  /** Stored daily snapshots (migration 051), oldest first. */
  snapshots: { date: string; actual: number; planned: number | null }[];
};

/**
 * Planned vs actual over time for the S-curve, rebuilt from checklist step
 * dates, zone observations and floor schedules. Null when the viewer can't
 * see Progression.
 */
export async function getCompletionHistory(projectId: string): Promise<CompletionHistory | null> {
  const records = await getChecklistStepRecords(projectId);
  if (!records) return null;
  const admin = createServiceRoleClient();
  const verifiedOnly = await getVerifiedOnly(projectId);

  if ((await getProgressionVersion(projectId)) === 2) {
    const data = await loadV2ProjectData(projectId);
    if (data) {
      const zoneData = (await loadZoneData([projectId]).catch(() => new Map())).get(projectId);
      const { data: snapRows } = await admin
        .from("completion_snapshots" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("snapshot_date", { ascending: true })
        .limit(400);
      return {
        points: v2HistoryPoints(data, todayInIndia(), (date) => {
          const out = new Map<string, number>();
          for (const [floorId, r] of zoneFloorResults(zoneData, date, verifiedOnly)) out.set(floorId, r.percent);
          return out;
        }),
        snapshots: ((snapRows ?? []) as unknown as Array<{ snapshot_date: string; actual: number; planned: number | null }>).map((row) => ({
          date: row.snapshot_date,
          actual: Number(row.actual),
          planned: row.planned != null ? Number(row.planned) : null,
        })),
      };
    }
  }

  const [{ data: progressions }, zoneMap, { data: snapshotRows }] = await Promise.all([
    admin
      .from("project_progressions")
      .select("floor_id, track, planned_start_date, planned_end_date")
      .eq("project_id", projectId)
      .is("deleted_at", null),
    loadZoneData([projectId]).catch(() => new Map()),
    admin
      .from("completion_snapshots" as never)
      .select("*")
      .eq("project_id", projectId)
      .order("snapshot_date", { ascending: true })
      .limit(400),
  ]);

  const totals = new Map<string, number>();
  for (const step of records.steps) {
    const key = `${step.floorId}:${step.track}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const floors: SCurveFloor[] = records.floorIds.map((floorId) => ({
    floorId,
    tracks: PROGRESSION_TRACKS.map((track) => {
      const p = (progressions ?? []).find((row) => row.floor_id === floorId && row.track === track);
      return {
        track,
        total: totals.get(`${floorId}:${track}`) ?? 0,
        plannedStart: (p?.planned_start_date as string | null) ?? null,
        plannedEnd: (p?.planned_end_date as string | null) ?? null,
      };
    }),
  }));

  const zoneData = zoneMap.get(projectId);
  const earliestZoneDate =
    zoneData?.observations.map((o: { observedOn: string }) => o.observedOn).sort()[0] ?? null;

  const points = buildSCurve({
    floors,
    steps: records.steps,
    today: todayInIndia(),
    earliestZoneDate,
    zonePlannedOnDate: zoneData?.plans.length ? (date) => zoneFloorPlanned(zoneData, date) : undefined,
    extraPlanDates: zoneData?.plans.flatMap((p: { start: string; end: string }) => [p.start, p.end]) ?? [],
    zonePercentsOnDate: zoneData?.zones.length
      ? (date) => {
          const out = new Map<string, number>();
          for (const [floorId, r] of zoneFloorResults(zoneData, date, verifiedOnly)) out.set(floorId, r.percent);
          return out;
        }
      : undefined,
  });

  const snapshots = ((snapshotRows ?? []) as unknown as Array<{
    snapshot_date: string;
    actual: number;
    planned: number | null;
  }>).map((s) => ({
    date: s.snapshot_date,
    actual: Number(s.actual),
    planned: s.planned != null ? Number(s.planned) : null,
  }));

  return { points, snapshots };
}

/** Record today's completion for the audit trail (migration 051; no-op before). */
async function writeCompletionSnapshot(
  projectId: string,
  completion: ProjectCompletion,
  verifiedOnly: boolean
): Promise<void> {
  try {
    await createServiceRoleClient()
      .from("completion_snapshots" as never)
      .upsert(
        {
          project_id: projectId,
          snapshot_date: todayInIndia(),
          actual: Math.round(completion.actual * 100) / 100,
          planned: completion.planned != null ? Math.round(completion.planned * 100) / 100 : null,
          status: completion.summary.status,
          verified_only: verifiedOnly,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "project_id,snapshot_date" }
      );
  } catch {
    // Snapshots are best-effort.
  }
}

/** v2 S-curve: actual (work ended by each date) vs planned, weekly-ish points. */
function v2HistoryPoints(
  data: Awaited<ReturnType<typeof loadV2ProjectData>> & object,
  today: string,
  zonesOn: (date: string) => Map<string, number>
): SCurvePoint[] {
  const starts: string[] = [];
  const ends: string[] = [today];
  for (const cl of data.checklists) {
    if (cl.plannedStart) starts.push(cl.plannedStart.slice(0, 10));
    if (cl.plannedEnd) ends.push(cl.plannedEnd.slice(0, 10));
    for (const ph of cl.phases) for (const st of ph.steps) if (st.doneDate) starts.push(st.doneDate);
  }
  if (starts.length === 0) return [];
  const DAY = 86_400_000;
  const toMs = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  const startMs = toMs(starts.sort()[0]);
  const endMs = toMs(ends.sort().at(-1)!);
  const stepDays = Math.max(7, Math.ceil(Math.max(1, (endMs - startMs) / DAY) / 39));
  const dates: string[] = [];
  for (let ms = startMs; ms < endMs; ms += stepDays * DAY) dates.push(new Date(ms).toISOString().slice(0, 10));
  dates.push(new Date(endMs).toISOString().slice(0, 10));
  if (!dates.includes(today)) dates.push(today);
  dates.sort();
  return dates.map((date) => {
    const r = v2CompletionFor(data, date, { asOf: true, zoneActual: date <= today ? zonesOn(date) : undefined });
    return { date, actual: date <= today ? r.actual : null, planned: r.planned };
  });
}
