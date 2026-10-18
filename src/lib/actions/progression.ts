"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canEditProgression, isBuildViewStaffRole } from "@/lib/auth/roles";
import { assertClientNotSuspended } from "@/lib/auth/client-suspension";
import { getProjectProgressionFresh } from "@/lib/data/progression";
import { validate } from "@/lib/validations/parse";
import { setProgressionStepSchema } from "@/lib/validations/progression";
import { projectIdSchema } from "@/lib/validations/data";
import { uuid } from "@/lib/validations/primitives";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import type { ProjectProgressionBundle } from "@/lib/progression/types";
import type { UserRole } from "@/lib/types";

async function requireProgressionEditor(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PublicError("You must be signed in.");

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, client_id, is_active, deleted_at")
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

  if (!isBuildViewStaffRole(role)) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!project) {
      throw new PublicError("You do not have access to this project.");
    }
  }

  return { userId: profile.id, role };
}

/** Switch floor checklist without a full page reload. */
export async function selectProgressionFloor(
  projectId: string,
  floorId: string
): Promise<{ ok: true; progression: ProjectProgressionBundle } | { ok: false; error: string }> {
  if (!validate(projectIdSchema, projectId).success) {
    return { ok: false, error: "Invalid project." };
  }
  if (!validate(uuid("Floor"), floorId).success) {
    return { ok: false, error: "Invalid floor." };
  }

  try {
    const progression = await getProjectProgressionFresh(projectId, floorId, {
      ensureMissing: false,
    });
    if (!progression?.selected) {
      return { ok: false, error: "Floor checklist not found." };
    }
    return { ok: true, progression };
  } catch (err) {
    logServerError("selectProgressionFloor", err);
    return {
      ok: false,
      error: getErrorMessage(err, "Failed to load floor checklist."),
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

    // Soft revalidate for next navigation — client already has optimistic + returned bundle
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}`);

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
