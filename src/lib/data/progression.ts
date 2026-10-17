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
  ProgressionStepView,
  ProjectProgressionView,
} from "@/lib/progression/types";
import type { UserRole } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

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
    // Default construction when unset — matches resolveClientDashboardType
    return (client?.dashboard_type ?? "construction") === "construction";
  } catch {
    return false;
  }
}

async function ensureProgressionRows(projectId: string, actorId: string): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("project_progressions")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) return existing.id;

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

  const { data: templateSteps, error: stepsError } = await admin
    .from("progression_template_steps")
    .select("id, step_number")
    .eq("template_id", template.id)
    .order("step_number", { ascending: true });

  if (stepsError || !templateSteps?.length) {
    console.warn("[progression] template steps missing:", stepsError?.message);
    return null;
  }

  const { data: created, error: createError } = await admin
    .from("project_progressions")
    .insert({
      project_id: projectId,
      template_id: template.id,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (createError) {
    // Race: another request created it
    const { data: raced } = await admin
      .from("project_progressions")
      .select("id")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .maybeSingle();
    if (raced?.id) return raced.id;
    console.warn("[progression] create failed:", createError.message);
    return null;
  }

  const rows = templateSteps.map((step) => ({
    progression_id: created.id,
    template_step_id: step.id,
    step_number: step.step_number,
    status: "pending" as const,
  }));

  const { error: insertStepsError } = await admin.from("project_progression_steps").insert(rows);
  if (insertStepsError) {
    console.warn("[progression] step seed failed:", insertStepsError.message);
  }

  return created.id;
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

async function loadProjectProgressionView(
  projectId: string,
  actor: Actor
): Promise<ProjectProgressionView | null> {
  if (!(await assertProjectReadable(projectId, actor))) return null;
  if (!(await isConstructionProject(projectId))) return null;

  let progressionId: string | null = null;
  try {
    progressionId = await ensureProgressionRows(projectId, actor.id);
  } catch (err) {
    console.warn("[getProjectProgression] ensure failed:", err);
    return null;
  }
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

  if (stepsRes.error) {
    // Fallback without user join if the FK hint is unavailable
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

    const steps = mapSteps(
      (plain.data ?? []).map((row) => ({
        ...(row as Omit<(typeof plain.data)[number], never>),
        completed_by_user: null,
      })) as unknown as Parameters<typeof mapSteps>[0]
    );
    return assembleView(projectId, progressionId, steps, logsRes.data ?? [], templateRes.data, actor);
  }

  const steps = mapSteps(
    (stepsRes.data ?? []) as unknown as Parameters<typeof mapSteps>[0]
  );
  return assembleView(projectId, progressionId, steps, logsRes.data ?? [], templateRes.data, actor);
}

function assembleView(
  projectId: string,
  progressionId: string,
  steps: ProgressionStepView[],
  logsRaw: unknown,
  templateRes: { template: unknown } | null | undefined,
  actor: Actor
): ProjectProgressionView {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalCount = steps.length;
  const logs = (logsRaw ?? []) as Array<{ action: string; work_date: string }>;
  const templateKey =
    (templateRes?.template as { key: string } | null)?.key ?? PROGRESSION_TEMPLATE_KEY;

  return {
    id: progressionId,
    projectId,
    templateKey,
    overallPercent: overallPercent(completedCount, totalCount),
    completedCount,
    totalCount,
    phases: buildPhases(steps),
    daily: buildDailySeries(logs, 14),
    weekly: buildWeeklySeries(logs, 8),
    canEdit: canEditProgression(actor.role),
  };
}

/**
 * Load Progression Report for a construction project.
 * Returns null when the client is portfolio, migration is missing, or the user has no access.
 */
export const getProjectProgression = cache(async (projectId: string) => {
  if (!validate(projectIdSchema, projectId).success) return null;
  const actor = await getActor();
  if (!actor) return null;
  return loadProjectProgressionView(projectId, actor);
});

/** Fresh read after a mutation (bypasses React cache()). */
export async function getProjectProgressionFresh(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return null;
  const actor = await getActor();
  if (!actor) return null;
  return loadProjectProgressionView(projectId, actor);
}

/**
 * Read-only Progression % for many projects (no auto-seed).
 * Used by the Construction Intelligence dashboard so project bars match Overview.
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
      .select("id, project_id")
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

    for (const progression of progressions) {
      const counts = totals.get(progression.id);
      if (!counts || counts.total === 0) continue;
      result.set(
        progression.project_id,
        Math.round((counts.completed / counts.total) * 100)
      );
    }
  } catch (err) {
    console.warn("[getProgressionPercentByProjectIds] failed:", err);
  }

  return result;
}
