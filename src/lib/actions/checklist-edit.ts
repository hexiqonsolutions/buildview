"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { logAuditEvent } from "@/lib/activity/audit";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import { validate } from "@/lib/validations/parse";
import { stepKey } from "@/lib/progression/methods";
import type { UserRole } from "@/lib/types";

/**
 * Edit a v2 checklist for one project: rename, reorder, add, hide steps,
 * photo-expected, phase names and weights. The first edit creates the
 * project's own copy of the list; floors move to it with recorded work kept
 * (reconcile_progression_v2). Steps with recorded work are hidden, not deleted.
 */

export type EditableStep = { id: string | null; title: string; photoExpected: boolean; used: boolean };
export type EditablePhase = { number: number; name: string; weight: number; steps: EditableStep[] };
export type EditableList = { templateId: string; baseKey: string; name: string; isProjectCopy: boolean; totalWeight: number; phases: EditablePhase[] };

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function manager(projectId: string) {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");
  const role = actor.role as UserRole;
  if (!(isBuildViewStaffRole(role) || role === "client_admin") || !(await canViewProject(actor, projectId))) {
    throw new PublicError("Only BuildView staff or the Client Admin can edit steps.");
  }
  return actor;
}

type TplRow = { id: string; key: string; base_key: string | null; name: string; track: string; method: string; project_id: string | null; version: number };
type TplStep = { id: string; step_number: number; phase_number: number; phase_name: string; phase_stage: string; title: string; step_key: string | null; phase_weight: number | null; alias_keys: string[] | null; photo_expected: boolean; hidden_at: string | null };

async function loadList(templateId: string): Promise<{ tpl: TplRow; steps: TplStep[] } | null> {
  const admin = createServiceRoleClient();
  const { data: tpl } = await admin.from("progression_templates").select("*").eq("id", templateId).maybeSingle();
  if (!tpl) return null;
  const { data: steps } = await admin.from("progression_template_steps").select("*").eq("template_id", templateId).order("step_number");
  return { tpl: tpl as unknown as TplRow, steps: (steps ?? []) as unknown as TplStep[] };
}

export async function getEditableList(input: { projectId: string; templateId: string }): Promise<Result<EditableList>> {
  try {
    if (!z.string().uuid().safeParse(input?.projectId).success || !z.string().uuid().safeParse(input?.templateId).success) {
      return { ok: false, error: "Invalid list." };
    }
    await manager(input.projectId);
    const list = await loadList(input.templateId);
    if (!list || (list.tpl.project_id && list.tpl.project_id !== input.projectId)) return { ok: false, error: "List not found." };
    const admin = createServiceRoleClient();
    // Steps with recorded work anywhere on this project can only be hidden.
    const { data: used } = await admin
      .from("project_progression_steps")
      .select("template_step_id, progression:project_progressions!inner(project_id)")
      .eq("progression.project_id", input.projectId)
      .neq("status", "pending")
      .in("template_step_id", list.steps.map((s) => s.id));
    const usedIds = new Set(((used ?? []) as unknown as { template_step_id: string }[]).map((u) => u.template_step_id));
    const phases = new Map<number, EditablePhase>();
    for (const s of list.steps) {
      if (s.hidden_at) continue;
      const p = phases.get(s.phase_number) ?? { number: s.phase_number, name: s.phase_name, weight: Number(s.phase_weight ?? 0), steps: [] };
      p.steps.push({ id: s.id, title: s.title, photoExpected: s.photo_expected, used: usedIds.has(s.id) });
      phases.set(s.phase_number, p);
    }
    const ordered = [...phases.values()].sort((a, b) => a.number - b.number);
    return {
      ok: true,
      data: {
        templateId: list.tpl.id,
        baseKey: list.tpl.base_key ?? list.tpl.key,
        name: list.tpl.name,
        isProjectCopy: Boolean(list.tpl.project_id),
        totalWeight: Math.round(ordered.reduce((sum, p) => sum + p.weight, 0) * 100) / 100,
        phases: ordered,
      },
    };
  } catch (err) {
    logServerError("checklistEdit:get", err);
    return { ok: false, error: getErrorMessage(err, "Could not load the list.") };
  }
}

const stepSchema = z.object({ id: z.string().uuid().nullable(), title: z.string().trim().min(2).max(160), photoExpected: z.boolean() }).strict();
const phaseSchema = z.object({ number: z.number().int().min(1).max(50), name: z.string().trim().min(2).max(80), weight: z.number().min(0).max(100), steps: z.array(stepSchema).max(60) }).strict();
const saveSchema = z.object({ projectId: z.string().uuid(), templateId: z.string().uuid(), phases: z.array(phaseSchema).min(1).max(20) }).strict();

export async function saveEditedList(input: unknown): Promise<Result<{ switched: number; carried: number }>> {
  const parsed = validate(saveSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, templateId, phases } = parsed.data;
  try {
    const actor = await manager(projectId);
    const admin = createServiceRoleClient();
    const list = await loadList(templateId);
    if (!list || (list.tpl.project_id && list.tpl.project_id !== projectId)) return { ok: false, error: "List not found." };

    const weightByPhase = new Map<number, number>();
    for (const s of list.steps) if (!s.hidden_at) weightByPhase.set(s.phase_number, Number(s.phase_weight ?? 0));
    const original = Math.round(Array.from(weightByPhase.values()).reduce((a, b) => a + b, 0) * 100) / 100;
    const total = Math.round(phases.reduce((sum, p) => sum + p.weight, 0) * 100) / 100;
    if (Math.abs(total - original) > 0.01) return { ok: false, error: `Phase weights must add up to ${original}% (now ${total}%).` };
    if (phases.every((p) => p.steps.length === 0)) return { ok: false, error: "Keep at least one step." };

    // 1. The project's own copy (created on first edit).
    let copy = list.tpl;
    let copySteps = list.steps;
    if (!list.tpl.project_id) {
      const baseKey = list.tpl.base_key ?? list.tpl.key;
      const { data: existing } = await admin.from("progression_templates" as never).select("id").eq("base_key", baseKey).eq("project_id", projectId).maybeSingle();
      if (existing) {
        const l = await loadList((existing as { id: string }).id);
        if (!l) throw new Error("Copy missing");
        copy = l.tpl;
        copySteps = l.steps;
      } else {
        const { data: created, error } = await admin
          .from("progression_templates")
          .insert({ key: `${baseKey}__${projectId}`, name: list.tpl.name, version: 2, is_active: true, method: list.tpl.method, track: list.tpl.track, base_key: baseKey, project_id: projectId } as never)
          .select("*")
          .single();
        if (error || !created) throw error ?? new Error("Could not copy the list.");
        copy = created as unknown as TplRow;
        const { error: stepsErr } = await admin.from("progression_template_steps").insert(
          list.steps.map((s) => ({
            template_id: copy.id,
            step_number: s.step_number,
            phase_number: s.phase_number,
            phase_name: s.phase_name,
            phase_stage: s.phase_stage,
            title: s.title,
            step_key: s.step_key,
            phase_weight: s.phase_weight,
            alias_keys: s.alias_keys ?? [],
            photo_expected: s.photo_expected,
            hidden_at: s.hidden_at,
          })) as never
        );
        if (stepsErr) throw stepsErr;
        const l = await loadList(copy.id);
        copySteps = l?.steps ?? [];
      }
    }

    // Map edited ids (base or copy) to the copy's rows by step key.
    const baseKeyById = new Map(list.steps.map((s) => [s.id, s.step_key]));
    const copyByKey = new Map(copySteps.map((s) => [s.step_key, s]));
    const resolve = (id: string | null) => {
      if (!id) return null;
      const direct = copySteps.find((s) => s.id === id);
      if (direct) return direct;
      const key = baseKeyById.get(id);
      return key ? (copyByKey.get(key) ?? null) : null;
    };

    // 2. Move every step out of the way, then write the new order.
    for (const s of copySteps) {
      await admin.from("progression_template_steps").update({ step_number: s.step_number + 10000 } as never).eq("id", s.id);
    }
    const kept = new Set<string>();
    const usedKeys = new Set(copySteps.map((s) => s.step_key));
    let n = 0;
    for (const phase of phases.slice().sort((a, b) => a.number - b.number)) {
      for (const st of phase.steps) {
        n += 1;
        const row = resolve(st.id);
        const fields = { step_number: n, phase_number: phase.number, phase_name: phase.name, phase_weight: phase.weight, title: st.title, photo_expected: st.photoExpected, hidden_at: null };
        if (row) {
          kept.add(row.id);
          await admin.from("progression_template_steps").update(fields as never).eq("id", row.id);
        } else {
          let key = stepKey(st.title) || "custom_step";
          const base = key;
          let i = 2;
          while (usedKeys.has(key)) key = `${base}_${i++}`;
          usedKeys.add(key);
          const { error } = await admin
            .from("progression_template_steps")
            .insert({ template_id: copy.id, ...fields, phase_stage: phase.name, step_key: key, alias_keys: [] } as never);
          if (error) throw error;
        }
      }
    }
    // 3. Removed steps: hidden when used on this project, otherwise deleted.
    const removed = copySteps.filter((s) => !kept.has(s.id) && !s.hidden_at);
    for (const s of removed) {
      n += 1;
      const { data: work } = await admin.from("project_progression_steps").select("id").eq("template_step_id", s.id).neq("status", "pending").limit(1);
      if ((work ?? []).length > 0) {
        await admin.from("progression_template_steps").update({ hidden_at: new Date().toISOString(), step_number: n } as never).eq("id", s.id);
      } else {
        await admin.from("project_progression_steps").delete().eq("template_step_id", s.id);
        await admin.from("progression_template_steps").delete().eq("id", s.id);
      }
    }
    // Already-hidden rows keep a unique number after the visible ones.
    for (const s of copySteps.filter((x) => x.hidden_at)) {
      n += 1;
      await admin.from("progression_template_steps").update({ step_number: n } as never).eq("id", s.id);
    }

    // 4. Floors / buildings move to the copy (or gain new steps), work kept.
    const { data: counts, error: rpcError } = await admin.rpc("reconcile_progression_v2" as never, { p_project: projectId, p_actor: actor.userId } as never);
    if (rpcError) throw rpcError;
    const row = (Array.isArray(counts) ? counts[0] : counts) as { switched?: number; carried?: number } | undefined;
    await logAuditEvent({
      action: "progression.list_edited",
      entityType: "progression_template",
      entityId: copy.id,
      projectId,
      metadata: { list: list.tpl.name, steps: n, removed: removed.length },
    }).catch(() => undefined);
    return { ok: true, data: { switched: Number(row?.switched ?? 0), carried: Number(row?.carried ?? 0) } };
  } catch (err) {
    logServerError("checklistEdit:save", err);
    return { ok: false, error: getErrorMessage(err, "Could not save the list.") };
  }
}
