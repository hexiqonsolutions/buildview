"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canEditProgression, isBuildViewStaffRole } from "@/lib/auth/roles";
import { assertClientNotSuspended } from "@/lib/auth/client-suspension";
import {
  getProjectProgression,
  getProjectProgressionFresh,
} from "@/lib/data/progression";
import { validate } from "@/lib/validations/parse";
import { setProgressionStepSchema } from "@/lib/validations/progression";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
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

export async function setProgressionStep(input: unknown) {
  const parsed = validate(setProgressionStepSchema, input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error };
  }

  const { projectId, floorId, stepId, completed, workDate, note } = parsed.data;

  try {
    const actor = await requireProgressionEditor(projectId);
    const view = await getProjectProgression(projectId, floorId);
    const selected = view?.selected;
    if (!view || !selected) {
      return {
        ok: false as const,
        error: "Progression Report is not available for this floor.",
      };
    }

    const step = selected.phases.flatMap((p) => p.steps).find((s) => s.id === stepId);
    if (!step) {
      return { ok: false as const, error: "Step not found." };
    }

    const alreadyCompleted = step.status === "completed";
    if (completed && alreadyCompleted) {
      return { ok: true as const, progression: view };
    }
    if (!completed && !alreadyCompleted) {
      return { ok: true as const, progression: view };
    }

    const admin = createServiceRoleClient();
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
        .eq("progression_id", selected.id);

      if (error) throw error;

      const { error: logError } = await admin.from("project_progression_logs").insert({
        progression_id: selected.id,
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
        .eq("progression_id", selected.id);

      if (error) throw error;

      const { error: logError } = await admin.from("project_progression_logs").insert({
        progression_id: selected.id,
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
      .eq("id", selected.id);

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}`);

    const progression = await getProjectProgressionFresh(projectId, floorId);
    return { ok: true as const, progression };
  } catch (err) {
    logServerError("setProgressionStep", err);
    return {
      ok: false as const,
      error: getErrorMessage(err, "Failed to update progression step."),
    };
  }
}
