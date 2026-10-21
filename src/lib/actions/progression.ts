"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canEditProgression, canViewProgression, isBuildViewStaffRole } from "@/lib/auth/roles";
import { assertClientNotSuspended } from "@/lib/auth/client-suspension";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import {
  getProjectProgressionFresh,
  isConstructionProjectForProgression,
} from "@/lib/data/progression";
import { validate } from "@/lib/validations/parse";
import {
  progressionStepActionSchema,
  selectProgressionSectionSchema,
  setProgressionStepSchema,
  updateProgressionStepDatesSchema,
} from "@/lib/validations/progression";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import { recordTimelineEntry } from "@/lib/timeline/auto-entry";
import { PROGRESSION_TRACK_LABELS, type ProgressionTrack } from "@/lib/progression/catalog";
import type { ProjectProgressionBundle } from "@/lib/progression/types";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

function todayInKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function requireProgressionViewer(projectId: string) {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");

  if (!canViewProgression(actor.role)) {
    throw new PublicError("You do not have permission to view the Progression Report.");
  }

  if (!(await canViewProject(actor, projectId))) {
    throw new PublicError("You do not have access to this project.");
  }

  if (!(await isConstructionProjectForProgression(projectId))) {
    throw new PublicError("Progression Report is not available for this project.");
  }

  return actor;
}

async function requireProgressionEditor(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in.");

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, client_id, full_name, is_active, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.deleted_at || !profile.role) {
    throw new PublicError("Your account is not active.");
  }

  await assertClientNotSuspended({
    role: profile.role as UserRole,
    client_id: profile.client_id,
  });

  const role = profile.role as UserRole;
  if (!canEditProgression(role)) {
    throw new PublicError("You do not have permission to update the Progression Report.");
  }

  if (!(await isConstructionProjectForProgression(projectId))) {
    throw new PublicError("Progression Report is not available for this project.");
  }

  if (!isBuildViewStaffRole(role)) {
    const allowed = await canViewProject(
      { userId: profile.id, role, clientId: profile.client_id },
      projectId
    );
    if (!allowed) {
      throw new PublicError("You do not have access to this project.");
    }
  }

  return {
    userId: profile.id,
    role,
    fullName: (profile.full_name as string | null) ?? null,
  };
}

/** Switch one track section's floor without a full page reload. */
export async function selectProgressionSection(
  input: unknown
): Promise<{ ok: true; progression: ProjectProgressionBundle } | { ok: false; error: string }> {
  const parsed = validate(selectProgressionSectionSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };

  const { projectId, track, floorId } = parsed.data;
  const selections = {
    preFloorId: track === "pre_slab" ? floorId : (parsed.data.preFloorId ?? null),
    postFloorId: track === "post_slab" ? floorId : (parsed.data.postFloorId ?? null),
  };

  try {
    await requireProgressionViewer(projectId);
    const progression = await getProjectProgressionFresh(projectId, selections, {
      ensureMissing: false,
    });
    if (!progression?.selectedByTrack[track]) {
      return { ok: false, error: "Floor checklist not found." };
    }
    return { ok: true, progression };
  } catch (err) {
    logServerError("selectProgressionSection", err);
    return {
      ok: false,
      error: getErrorMessage(err, "Failed to load floor checklist."),
    };
  }
}

/** Legacy Post-Slab floor switch (kept for compatibility). */
export async function selectProgressionFloor(
  projectId: string,
  floorId: string
): Promise<{ ok: true; progression: ProjectProgressionBundle } | { ok: false; error: string }> {
  return selectProgressionSection({
    projectId,
    track: "post_slab" as const,
    floorId,
  });
}

type StepContext = {
  stepId: string;
  status: string;
  stepNumber: number;
  title: string;
  phaseName: string;
  progressionId: string;
  buildingName: string;
  floorName: string;
};

async function loadStepContext(
  admin: ReturnType<typeof createServiceRoleClient>,
  stepId: string,
  projectId: string,
  floorId: string,
  track: ProgressionTrack
): Promise<StepContext | null> {
  const { data: stepRow, error } = await admin
    .from("project_progression_steps")
    .select(
      "id, status, step_number, progression:project_progressions!inner(id, project_id, floor_id, building_id, track, deleted_at), template_step:progression_template_steps(step_number, title, phase_name)"
    )
    .eq("id", stepId)
    .maybeSingle();

  if (error || !stepRow) return null;

  const progression = stepRow.progression as unknown as {
    id: string;
    project_id: string;
    floor_id: string;
    building_id: string | null;
    track: string;
    deleted_at: string | null;
  } | null;

  if (
    !progression ||
    progression.deleted_at ||
    progression.project_id !== projectId ||
    progression.floor_id !== floorId ||
    progression.track !== track
  ) {
    return null;
  }

  const tpl = stepRow.template_step as unknown as {
    step_number: number;
    title: string;
    phase_name: string;
  } | null;

  const { data: floorRow } = await admin
    .from("floors")
    .select("name, building:buildings(name)")
    .eq("id", floorId)
    .maybeSingle();
  const building = floorRow?.building as unknown as { name: string } | null;

  return {
    stepId: stepRow.id as string,
    status: stepRow.status as string,
    stepNumber: tpl?.step_number ?? (stepRow.step_number as number),
    title: tpl?.title ?? "Step",
    phaseName: tpl?.phase_name ?? "",
    progressionId: progression.id,
    buildingName: building?.name ?? "Tower",
    floorName: (floorRow?.name as string) ?? "Floor",
  };
}

async function freshBundle(
  projectId: string,
  track: ProgressionTrack,
  floorId: string,
  selections?: { preFloorId?: string; postFloorId?: string }
) {
  return getProjectProgressionFresh(
    projectId,
    {
      preFloorId: track === "pre_slab" ? floorId : (selections?.preFloorId ?? null),
      postFloorId: track === "post_slab" ? floorId : (selections?.postFloorId ?? null),
    },
    { ensureMissing: false }
  );
}

type StepTransition = "start" | "end" | "reset";

async function transitionProgressionStep(input: unknown, transition: StepTransition) {
  const parsed = validate(progressionStepActionSchema, input);
  if (!parsed.success) return { ok: false as const, error: parsed.error };

  const { projectId, floorId, track, stepId } = parsed.data;
  const selections = {
    preFloorId: parsed.data.preFloorId,
    postFloorId: parsed.data.postFloorId,
  };

  try {
    const actor = await requireProgressionEditor(projectId);
    const admin = createServiceRoleClient();
    const ctx = await loadStepContext(admin, stepId, projectId, floorId, track);
    if (!ctx) return { ok: false as const, error: "Step does not belong to this floor." };

    const now = new Date().toISOString();
    const workDate = todayInKolkata();

    let updateQuery = admin.from("project_progression_steps").update(
      transition === "start"
        ? { status: "in_progress", started_at: now, started_by: actor.userId }
        : transition === "end"
          ? {
              status: "completed",
              ended_at: now,
              ended_by: actor.userId,
              completed_at: now,
              completed_by: actor.userId,
              work_date: workDate,
            }
          : {
              status: "pending",
              started_at: null,
              started_by: null,
              ended_at: null,
              ended_by: null,
              completed_at: null,
              completed_by: null,
              work_date: null,
              note: null,
            }
    );

    updateQuery =
      transition === "start"
        ? updateQuery.eq("id", stepId).eq("status", "pending")
        : transition === "end"
          ? updateQuery.eq("id", stepId).eq("status", "in_progress")
          : updateQuery.eq("id", stepId).in("status", ["in_progress", "completed"]);

    const { data: changed, error: updateError } = await updateQuery.select("id");
    if (updateError) throw updateError;

    // Idempotent no-op: already in the target state — no duplicate log/Timeline.
    if (!changed?.length) {
      const bundle = await freshBundle(projectId, track, floorId, selections);
      return { ok: true as const, progression: bundle };
    }

    const logAction =
      transition === "start" ? "started" : transition === "end" ? "ended" : "reset";
    const { error: logError } = await admin.from("project_progression_logs").insert({
      progression_id: ctx.progressionId,
      step_id: stepId,
      action: logAction,
      work_date: workDate,
      actor_id: actor.userId,
      note: null,
    });
    if (logError) throw logError;

    await admin
      .from("project_progressions")
      .update({ updated_by: actor.userId })
      .eq("id", ctx.progressionId);

    const actorLabel = `${actor.fullName ?? "BuildView user"} (${USER_ROLE_LABELS[actor.role]})`;
    const trackLabel = PROGRESSION_TRACK_LABELS[track];
    const verb =
      transition === "start"
        ? "started"
        : transition === "end"
          ? "completed"
          : "reset";
    await recordTimelineEntry(
      {
        project_id: projectId,
        title: `${transition === "reset" ? "Progress reset" : transition === "start" ? "Work started" : "Work completed"} — ${trackLabel} Step ${ctx.stepNumber}: ${ctx.title}`,
        progress_note: `${ctx.phaseName} · ${ctx.buildingName} · ${ctx.floorName} — ${verb} by ${actorLabel}.`,
        building: ctx.buildingName,
        floor: ctx.floorName,
        status: transition === "end" ? "completed" : "in_progress",
        author_name: actorLabel,
      },
      `progressionStep:${transition}`
    );

    const bundle = await freshBundle(projectId, track, floorId, selections);
    return { ok: true as const, progression: bundle };
  } catch (err) {
    logServerError(`progressionStep:${transition}`, err);
    return {
      ok: false as const,
      error: getErrorMessage(err, "Failed to update progression step."),
    };
  }
}

export async function startProgressionStep(input: unknown) {
  return transitionProgressionStep(input, "start");
}

export async function endProgressionStep(input: unknown) {
  return transitionProgressionStep(input, "end");
}

export async function resetProgressionStep(input: unknown) {
  return transitionProgressionStep(input, "reset");
}

export async function updateProgressionStepDates(input: unknown) {
  const parsed = validate(updateProgressionStepDatesSchema, input);
  if (!parsed.success) return { ok: false as const, error: parsed.error };

  const { projectId, floorId, track, stepId, startedAt, endedAt } = parsed.data;
  const selections = {
    preFloorId: parsed.data.preFloorId,
    postFloorId: parsed.data.postFloorId,
  };

  try {
    const actor = await requireProgressionEditor(projectId);
    const admin = createServiceRoleClient();
    const ctx = await loadStepContext(admin, stepId, projectId, floorId, track);
    if (!ctx) return { ok: false as const, error: "Step does not belong to this floor." };
    if (ctx.status === "pending" && (startedAt || endedAt)) {
      return { ok: false as const, error: "Start the step before setting dates." };
    }
    if (endedAt && !startedAt) {
      return { ok: false as const, error: "Start date is required before End date." };
    }

    const { error } = await admin
      .from("project_progression_steps")
      .update({
        started_at: startedAt,
        ended_at: endedAt,
        ...(ctx.status === "completed"
          ? { completed_at: endedAt, work_date: endedAt ? endedAt.slice(0, 10) : null }
          : {}),
      })
      .eq("id", stepId)
      .eq("progression_id", ctx.progressionId);
    if (error) throw error;

    const { error: logError } = await admin.from("project_progression_logs").insert({
      progression_id: ctx.progressionId,
      step_id: stepId,
      action: "date_corrected",
      work_date: (endedAt ?? startedAt ?? todayInKolkata()).slice(0, 10),
      actor_id: actor.userId,
      note: null,
    });
    if (logError) throw logError;

    const bundle = await freshBundle(projectId, track, floorId, selections);
    return { ok: true as const, progression: bundle };
  } catch (err) {
    logServerError("updateProgressionStepDates", err);
    return {
      ok: false as const,
      error: getErrorMessage(err, "Failed to update step dates."),
    };
  }
}

/**
 * Fast tick path: verify step via DB (no full bundle load), then light reload.
 */
export async function setProgressionStep(input: unknown) {
  const parsed = validate(setProgressionStepSchema, input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error };
  }

  const { projectId, floorId, stepId, completed, workDate, note } = parsed.data;

  try {
    const actor = await requireProgressionEditor(projectId);
    const admin = createServiceRoleClient();

    const { data: stepRow, error: stepError } = await admin
      .from("project_progression_steps")
      .select(
        "id, status, progression_id, progression:project_progressions!inner(id, project_id, floor_id, deleted_at)"
      )
      .eq("id", stepId)
      .maybeSingle();

    if (stepError || !stepRow) {
      return { ok: false as const, error: "Step not found." };
    }

    const progression = stepRow.progression as unknown as {
      id: string;
      project_id: string;
      floor_id: string;
      deleted_at: string | null;
    } | null;

    if (
      !progression ||
      progression.deleted_at ||
      progression.project_id !== projectId ||
      progression.floor_id !== floorId
    ) {
      return { ok: false as const, error: "Step does not belong to this floor." };
    }

    const alreadyCompleted = stepRow.status === "completed";
    if (completed && alreadyCompleted) {
      const bundle = await getProjectProgressionFresh(projectId, floorId, {
        ensureMissing: false,
      });
      return { ok: true as const, progression: bundle };
    }
    if (!completed && !alreadyCompleted) {
      const bundle = await getProjectProgressionFresh(projectId, floorId, {
        ensureMissing: false,
      });
      return { ok: true as const, progression: bundle };
    }

    const now = new Date().toISOString();

    if (completed) {
      const { error } = await admin
        .from("project_progression_steps")
        .update({
          status: "completed",
          started_at: now,
          started_by: actor.userId,
          ended_at: now,
          ended_by: actor.userId,
          completed_at: now,
          completed_by: actor.userId,
          work_date: workDate,
          note: note?.trim() || null,
        })
        .eq("id", stepId)
        .eq("progression_id", progression.id);

      if (error) throw error;

      const { error: logError } = await admin.from("project_progression_logs").insert({
        progression_id: progression.id,
        step_id: stepId,
        action: "completed",
        work_date: workDate,
        actor_id: actor.userId,
        note: note?.trim() || null,
      });
      if (logError) throw logError;
    } else {
      const { error } = await admin
        .from("project_progression_steps")
        .update({
          status: "pending",
          started_at: null,
          started_by: null,
          ended_at: null,
          ended_by: null,
          completed_at: null,
          completed_by: null,
          work_date: null,
          note: null,
        })
        .eq("id", stepId)
        .eq("progression_id", progression.id);

      if (error) throw error;

      const { error: logError } = await admin.from("project_progression_logs").insert({
        progression_id: progression.id,
        step_id: stepId,
        action: "reopened",
        work_date: workDate,
        actor_id: actor.userId,
        note: note?.trim() || null,
      });
      if (logError) throw logError;
    }

    await admin
      .from("project_progressions")
      .update({ updated_by: actor.userId })
      .eq("id", progression.id);

    // Avoid revalidatePath here — it refreshes the route and was resetting the
    // selected floor back to Floor 1 when ?floor= was out of sync.
    const bundle = await getProjectProgressionFresh(projectId, floorId, {
      ensureMissing: false,
    });
    return { ok: true as const, progression: bundle };
  } catch (err) {
    logServerError("setProgressionStep", err);
    return {
      ok: false as const,
      error: getErrorMessage(err, "Failed to update progression step."),
    };
  }
}
