import "server-only";

import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canEditProgression, canViewProgression } from "@/lib/auth/roles";
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

/** True when the project's client portal is construction (not portfolio showcase). */
export async function isConstructionProjectForProgression(
  projectId: string
): Promise<boolean> {
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
  track: ProgressionTrack = "post_slab"
): Promise<{
  templateId: string;
  steps: TemplateStepSeed[];
} | null> {
  const admin = createServiceRoleClient();
  const { data: template } = await admin
    .from("progression_templates")
    .select("id")
    .eq("key", PROGRESSION_TEMPLATE_KEYS[track])
    .eq("is_active", true)
    .maybeSingle();

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

/** Create progression + pending steps for one floor + track (idempotent). */
export async function ensureFloorProgression(
  projectId: string,
  floorId: string,
  buildingId: string,
  actorId?: string | null,
  track: ProgressionTrack = "post_slab"
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

  const template = await getActiveTemplateSteps(track);
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
  for (const floor of floors ?? []) {
    for (const track of PROGRESSION_TRACKS) {
      if (have.has(`${floor.id}:${track}`)) continue;
      await ensureFloorProgression(projectId, floor.id, floor.building_id, actorId, track);
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
      };
    })
    .filter((s): s is ProgressionStepView => s != null)
    .sort((a, b) => a.stepNumber - b.stepNumber);
}

function aggregateProjectPercent(combinedFloors: CombinedFloorSummary[]): {
  overallPercent: number;
  activatedFloorCount: number;
} {
  const activated = combinedFloors.filter((f) => f.activated);
  if (activated.length === 0) return { overallPercent: 0, activatedFloorCount: 0 };

  let completed = 0;
  let total = 0;
  for (const floor of activated) {
    completed += floor.completedCount;
    total += floor.totalCount;
  }
  return {
    overallPercent: overallPercent(completed, total),
    activatedFloorCount: activated.length,
  };
}

function summarizeTracks(
  floors: FloorProgressionSummary[],
  combinedFloors: CombinedFloorSummary[]
): TrackProgressionSummary[] {
  const activatedIds = new Set(
    combinedFloors.filter((f) => f.activated).map((f) => f.floorId)
  );
  return PROGRESSION_TRACKS.map((track) => {
    let completed = 0;
    let inProgress = 0;
    let total = 0;
    for (const floor of floors) {
      if (floor.track !== track || !activatedIds.has(floor.floorId)) continue;
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
};

async function loadFloorSummaries(projectId: string): Promise<FloorSummariesResult> {
  const admin = createServiceRoleClient();

  const { data: buildings } = await admin
    .from("buildings")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!buildings?.length) return { floors: [], combinedFloors: [] };

  const buildingIds = buildings.map((b) => b.id);
  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  const { data: floors } = await admin
    .from("floors")
    .select("id, building_id, name, sort_order")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!floors?.length) return { floors: [], combinedFloors: [] };

  const { data: progressions } = await admin
    .from("project_progressions")
    .select("id, floor_id, track")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const progressionByFloorTrack = new Map(
    (progressions ?? []).map((p) => [
      `${p.floor_id as string}:${p.track as string}`,
      p.id as string,
    ])
  );
  const progressionIds = (progressions ?? []).map((p) => p.id);
  const countsByProgression = new Map<
    string,
    { completed: number; inProgress: number; total: number }
  >();

  if (progressionIds.length > 0) {
    const { data: steps } = await admin
      .from("project_progression_steps")
      .select("progression_id, status")
      .in("progression_id", progressionIds);

    for (const step of steps ?? []) {
      const row = countsByProgression.get(step.progression_id) ?? {
        completed: 0,
        inProgress: 0,
        total: 0,
      };
      row.total += 1;
      if (step.status === "completed") row.completed += 1;
      if (step.status === "in_progress") row.inProgress += 1;
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

  for (const floor of floors) {
    const activated = activatedByFloor.get(floor.id) ?? false;
    let pooledCompleted = 0;
    let pooledInProgress = 0;
    let pooledTotal = 0;
    for (const track of PROGRESSION_TRACKS) {
      const progressionId = progressionByFloorTrack.get(`${floor.id}:${track}`);
      const counts = progressionId
        ? countsByProgression.get(progressionId) ?? { completed: 0, inProgress: 0, total: 0 }
        : { completed: 0, inProgress: 0, total: 0 };
      pooledCompleted += counts.completed;
      pooledInProgress += counts.inProgress;
      pooledTotal += counts.total;
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
        activated,
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
    });
  }

  return { floors: trackSummaries, combinedFloors };
}

async function loadFloorDetail(
  projectId: string,
  floorId: string,
  track: ProgressionTrack,
  actor: Actor,
  meta: { buildingId: string; buildingName: string; floorName: string }
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
        "id, template_step_id, step_number, status, started_at, started_by, ended_at, ended_by, completed_at, completed_by, work_date, note, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title), started_by_user:users!project_progression_steps_started_by_fkey(full_name), ended_by_user:users!project_progression_steps_ended_by_fkey(full_name), completed_by_user:users!project_progression_steps_completed_by_fkey(full_name)"
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
        "id, template_step_id, step_number, status, started_at, started_by, ended_at, ended_by, completed_at, completed_by, work_date, note, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title)"
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

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const inProgressCount = steps.filter((s) => s.status === "in_progress").length;
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

  const { combinedFloors } = await loadFloorSummaries(projectId);
  const canEdit = canEditProgression(actor.role);
  const wanted = normalizeSelections(selections);

  const prePick = pickDefaultFloorId(combinedFloors, wanted.preFloorId);
  const postPick = pickDefaultFloorId(combinedFloors, wanted.postFloorId);
  if (prePick.unknownPreferred || postPick.unknownPreferred) return null;

  const loadFor = (track: ProgressionTrack, floorId: string | null) => {
    if (!floorId) return Promise.resolve(null);
    const meta = combinedFloors.find((f) => f.floorId === floorId)!;
    return loadFloorDetail(projectId, floorId, track, actor, {
      buildingId: meta.buildingId,
      buildingName: meta.buildingName,
      floorName: meta.floorName,
    });
  };

  const [preSelected, postSelected] = await Promise.all([
    loadFor("pre_slab", prePick.floorId),
    loadFor("post_slab", postPick.floorId),
  ]);

  // Details may have seeded a missing track — refresh summaries for accurate totals.
  const refreshed = await loadFloorSummaries(projectId);
  const { overallPercent: overall, activatedFloorCount } = aggregateProjectPercent(
    refreshed.combinedFloors
  );

  return {
    projectId,
    overallPercent: overall,
    floorCount: refreshed.combinedFloors.length,
    activatedFloorCount,
    floors: refreshed.floors,
    combinedFloors: refreshed.combinedFloors,
    tracks: summarizeTracks(refreshed.floors, refreshed.combinedFloors),
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
 * Project health % for many projects — activated floors only, equal step weight.
 * Floors with zero ticks are excluded (decision 6B).
 */
export async function getProgressionPercentByProjectIds(
  projectIds: string[]
): Promise<Map<string, number>> {
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

    const progressionIds = progressions.map((p) => p.id);
    const { data: steps, error: stepsError } = await admin
      .from("project_progression_steps")
      .select("progression_id, status")
      .in("progression_id", progressionIds);

    if (stepsError || !steps) return result;

    const totals = new Map<
      string,
      { completed: number; started: number; total: number }
    >();
    for (const step of steps) {
      const row = totals.get(step.progression_id) ?? { completed: 0, started: 0, total: 0 };
      row.total += 1;
      if (step.status === "completed") row.completed += 1;
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

    const byProject = new Map<string, { completed: number; total: number }>();
    for (const floor of byFloor.values()) {
      if (floor.started === 0) continue;
      const agg = byProject.get(floor.projectId) ?? { completed: 0, total: 0 };
      agg.completed += floor.completed;
      agg.total += floor.total;
      byProject.set(floor.projectId, agg);
    }

    for (const [projectId, counts] of byProject) {
      result.set(projectId, overallPercent(counts.completed, counts.total));
    }
  } catch (err) {
    console.warn("[getProgressionPercentByProjectIds] failed:", err);
  }

  return result;
}
