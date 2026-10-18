import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canEditProgression, isBuildViewStaffRole } from "@/lib/auth/roles";
import { PROGRESSION_TEMPLATE_KEY } from "@/lib/progression/catalog";
import {
  buildDailySeries,
  buildPhases,
  buildWeeklySeries,
  overallPercent,
} from "@/lib/progression/stats";
import type {
  FloorProgressionSummary,
  ProgressionStepView,
  ProjectProgressionBundle,
  ProjectProgressionView,
} from "@/lib/progression/types";
import type { UserRole } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";
import { uuid } from "@/lib/validations/primitives";

type Actor = {
  id: string;
  role: UserRole;
};

async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, is_active, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.deleted_at || !profile.role) return null;
  return { id: profile.id, role: profile.role as UserRole };
}

async function assertProjectReadable(projectId: string, actor: Actor): Promise<boolean> {
  if (isBuildViewStaffRole(actor.role)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

async function isConstructionProject(projectId: string): Promise<boolean> {
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

async function getActiveTemplateSteps(): Promise<{
  templateId: string;
  steps: TemplateStepSeed[];
} | null> {
  const admin = createServiceRoleClient();
  const { data: template } = await admin
    .from("progression_templates")
    .select("id")
    .eq("key", PROGRESSION_TEMPLATE_KEY)
    .eq("is_active", true)
    .maybeSingle();

  if (!template?.id) {
    console.warn("[progression] active template missing — apply migration 032");
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

/** Create progression + pending steps for one floor (idempotent). */
export async function ensureFloorProgression(
  projectId: string,
  floorId: string,
  buildingId: string,
  actorId?: string | null
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("project_progressions")
    .select("id")
    .eq("floor_id", floorId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const template = await getActiveTemplateSteps();
  if (!template) return null;

  const { data: created, error: createError } = await admin
    .from("project_progressions")
    .insert({
      project_id: projectId,
      floor_id: floorId,
      building_id: buildingId,
      template_id: template.templateId,
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

/** Ensure every active floor on the project has a progression row. */
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

  const { data: floors } = await admin
    .from("floors")
    .select("id, building_id")
    .in("building_id", buildingIds)
    .is("deleted_at", null);

  for (const floor of floors ?? []) {
    await ensureFloorProgression(projectId, floor.id, floor.building_id, actorId);
  }
}

function mapSteps(
  rows: Array<{
    id: string;
    template_step_id: string;
    step_number: number;
    status: string;
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
    completed_by_user: { full_name: string | null } | null;
  }>
): ProgressionStepView[] {
  return rows
    .map((row) => {
      const tpl = row.template_step;
      if (!tpl) return null;
      return {
        id: row.id,
        templateStepId: row.template_step_id,
        stepNumber: row.step_number,
        phaseNumber: tpl.phase_number,
        phaseName: tpl.phase_name,
        phaseStage: tpl.phase_stage,
        title: tpl.title,
        status: row.status === "completed" ? ("completed" as const) : ("pending" as const),
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

function aggregateProjectPercent(floors: FloorProgressionSummary[]): {
  overallPercent: number;
  activatedFloorCount: number;
} {
  const activated = floors.filter((f) => f.activated);
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

async function loadFloorSummaries(projectId: string): Promise<FloorProgressionSummary[]> {
  const admin = createServiceRoleClient();

  const { data: buildings } = await admin
    .from("buildings")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!buildings?.length) return [];

  const buildingIds = buildings.map((b) => b.id);
  const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));

  const { data: floors } = await admin
    .from("floors")
    .select("id, building_id, name, sort_order")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!floors?.length) return [];

  const { data: progressions } = await admin
    .from("project_progressions")
    .select("id, floor_id")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const progressionByFloor = new Map(
    (progressions ?? []).map((p) => [p.floor_id as string, p.id as string])
  );
  const progressionIds = (progressions ?? []).map((p) => p.id);
  const countsByProgression = new Map<string, { completed: number; total: number }>();

  if (progressionIds.length > 0) {
    const { data: steps } = await admin
      .from("project_progression_steps")
      .select("progression_id, status")
      .in("progression_id", progressionIds);

    for (const step of steps ?? []) {
      const row = countsByProgression.get(step.progression_id) ?? {
        completed: 0,
        total: 0,
      };
      row.total += 1;
      if (step.status === "completed") row.completed += 1;
      countsByProgression.set(step.progression_id, row);
    }
  }

  return floors.map((floor) => {
    const progressionId = progressionByFloor.get(floor.id);
    const counts = progressionId
      ? countsByProgression.get(progressionId) ?? { completed: 0, total: 0 }
      : { completed: 0, total: 0 };
    const activated = counts.completed > 0;
    return {
      floorId: floor.id,
      buildingId: floor.building_id,
      buildingName: buildingNameById.get(floor.building_id) ?? "Building",
      floorName: floor.name,
      completedCount: counts.completed,
      totalCount: counts.total,
      percent: overallPercent(counts.completed, counts.total),
      activated,
    };
  });
}

async function loadFloorDetail(
  projectId: string,
  floorId: string,
  actor: Actor,
  meta: { buildingId: string; buildingName: string; floorName: string }
): Promise<ProjectProgressionView | null> {
  const progressionId = await ensureFloorProgression(
    projectId,
    floorId,
    meta.buildingId,
    actor.id
  );
  if (!progressionId) return null;

  const admin = createServiceRoleClient();
  const [stepsRes, logsRes, templateRes] = await Promise.all([
    admin
      .from("project_progression_steps")
      .select(
        "id, template_step_id, step_number, status, completed_at, completed_by, work_date, note, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title), completed_by_user:users!project_progression_steps_completed_by_fkey(full_name)"
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
      .select("id, template:progression_templates(key)")
      .eq("id", progressionId)
      .maybeSingle(),
  ]);

  let steps: ProgressionStepView[];
  if (stepsRes.error) {
    const plain = await admin
      .from("project_progression_steps")
      .select(
        "id, template_step_id, step_number, status, completed_at, completed_by, work_date, note, template_step:progression_template_steps(phase_number, phase_name, phase_stage, title)"
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
  const totalCount = steps.length;
  const logs = (logsRes.data ?? []) as Array<{ action: string; work_date: string }>;
  const templateKey =
    (templateRes.data?.template as { key: string } | null)?.key ?? PROGRESSION_TEMPLATE_KEY;

  return {
    id: progressionId,
    projectId,
    floorId,
    buildingId: meta.buildingId,
    buildingName: meta.buildingName,
    floorName: meta.floorName,
    templateKey,
    overallPercent: overallPercent(completedCount, totalCount),
    completedCount,
    totalCount,
    activated: completedCount > 0,
    phases: buildPhases(steps),
    daily: buildDailySeries(logs, 14),
    weekly: buildWeeklySeries(logs, 8),
    canEdit: canEditProgression(actor.role),
  };
}

function pickDefaultFloorId(
  floors: FloorProgressionSummary[],
  preferredFloorId?: string | null
): string | null {
  if (preferredFloorId && floors.some((f) => f.floorId === preferredFloorId)) {
    return preferredFloorId;
  }
  const inactive = floors.find((f) => !f.activated);
  if (inactive) return inactive.floorId;
  const leastComplete = [...floors].sort((a, b) => a.percent - b.percent)[0];
  return leastComplete?.floorId ?? null;
}

async function loadProjectProgressionBundle(
  projectId: string,
  actor: Actor,
  floorId?: string | null
): Promise<ProjectProgressionBundle | null> {
  if (!(await assertProjectReadable(projectId, actor))) return null;
  if (!(await isConstructionProject(projectId))) return null;

  try {
    await ensureProjectFloorProgressions(projectId, actor.id);
  } catch (err) {
    console.warn("[getProjectProgression] ensure floors failed:", err);
  }

  const floors = await loadFloorSummaries(projectId);
  const { overallPercent, activatedFloorCount } = aggregateProjectPercent(floors);
  const canEdit = canEditProgression(actor.role);

  const selectedFloorId = pickDefaultFloorId(floors, floorId);
  let selected: ProjectProgressionView | null = null;

  if (selectedFloorId) {
    const meta = floors.find((f) => f.floorId === selectedFloorId)!;
    selected = await loadFloorDetail(projectId, selectedFloorId, actor, {
      buildingId: meta.buildingId,
      buildingName: meta.buildingName,
      floorName: meta.floorName,
    });
  }

  return {
    projectId,
    overallPercent,
    floorCount: floors.length,
    activatedFloorCount,
    floors,
    selected,
    canEdit,
  };
}

/**
 * Load Progression Report bundle for a construction project.
 * Pass floorId to select a specific floor checklist.
 */
export const getProjectProgression = cache(
  async (projectId: string, floorId?: string | null) => {
    if (!validate(projectIdSchema, projectId).success) return null;
    if (floorId && !validate(uuid("Floor"), floorId).success) return null;
    const actor = await getActor();
    if (!actor) return null;
    return loadProjectProgressionBundle(projectId, actor, floorId);
  }
);

/** Fresh read after a mutation (bypasses React cache()). */
export async function getProjectProgressionFresh(
  projectId: string,
  floorId?: string | null
) {
  if (!validate(projectIdSchema, projectId).success) return null;
  if (floorId && !validate(uuid("Floor"), floorId).success) return null;
  const actor = await getActor();
  if (!actor) return null;
  return loadProjectProgressionBundle(projectId, actor, floorId);
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

    const totals = new Map<string, { completed: number; total: number }>();
    for (const step of steps) {
      const row = totals.get(step.progression_id) ?? { completed: 0, total: 0 };
      row.total += 1;
      if (step.status === "completed") row.completed += 1;
      totals.set(step.progression_id, row);
    }

    const byProject = new Map<string, { completed: number; total: number }>();
    for (const progression of progressions) {
      const counts = totals.get(progression.id);
      if (!counts || counts.total === 0) continue;
      // 6B: only activated floors (at least one tick)
      if (counts.completed === 0) continue;
      const agg = byProject.get(progression.project_id) ?? { completed: 0, total: 0 };
      agg.completed += counts.completed;
      agg.total += counts.total;
      byProject.set(progression.project_id, agg);
    }

    for (const [projectId, counts] of byProject) {
      result.set(projectId, overallPercent(counts.completed, counts.total));
    }
  } catch (err) {
    console.warn("[getProgressionPercentByProjectIds] failed:", err);
  }

  return result;
}
