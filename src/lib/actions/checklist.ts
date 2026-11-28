"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import { canEditProgression, canVerifyProgression, canViewProgression, isBuildViewStaffRole } from "@/lib/auth/roles";
import { isConstructionProjectForProgression } from "@/lib/data/progression";
import { loadV2ProjectData, v2CompletionFor } from "@/lib/data/progression-v2";
import { loadZoneData, zoneFloorResults } from "@/lib/data/zone-progress";
import { notifyProjectTeam } from "@/lib/notifications/team";
import { logAuditEvent } from "@/lib/activity/audit";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import { validate } from "@/lib/validations/parse";
import { todayInIndia } from "@/lib/progression/checklist-completion";
import { plannedPercent } from "@/lib/progression/completion";
import { STORAGE_BUCKETS, type UserRole } from "@/lib/types";

/**
 * Progression v2 checklist (the simple screen): Inside per floor, Outside per
 * building, Site works per project. One action per step: Start → Done.
 */

export type ChecklistScope = { kind: "floor"; floorId: string } | { kind: "building"; buildingId: string } | { kind: "site" };

export type ChecklistStep = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  na: boolean;
  photoExpected: boolean;
  startedAt: string | null;
  startedBy: string | null;
  endedAt: string | null;
  endedBy: string | null;
  photos: { start: number; end: number };
  verification: "verified" | "rejected" | null;
  verifiedBy: string | null;
  verificationNote: string | null;
  /** Day the work was done (YYYY-MM-DD). */
  workDate: string | null;
  note: string | null;
  /** 360 scan linked as evidence. */
  evidence: { id: string; name: string; url: string } | null;
};

export type ChecklistList = {
  progressionId: string;
  templateId: string;
  name: string;
  track: string;
  percent: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  /** Planned % today from the dates (null when no dates). */
  plannedPercent: number | null;
};

export type ChecklistScan = { id: string; name: string; date: string | null; url: string };

export type ChecklistPhase = { key: string; name: string; weight: number; percent: number | null; steps: ChecklistStep[] };

export type ChecklistOverview = {
  projectId: string;
  version: number;
  canEdit: boolean;
  canVerify: boolean;
  canManage: boolean;
  percent: number;
  parts: { inside: number; outside: number; site: number };
  split: { inside: number; outside: number; site: number };
  floors: { id: string; label: string; buildingName: string; percent: number }[];
  buildings: { id: string; name: string; percent: number }[];
};

export type ChecklistView = {
  title: string;
  percent: number;
  /** Lists shown here (Structure + Finishing on a floor) with their dates. */
  lists: ChecklistList[];
  /** 360 scans of this floor / building / site, for evidence. */
  scans: ChecklistScan[];
  phases: ChecklistPhase[];
  nextStepId: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const uuid = z.string().uuid();
const scopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("floor"), floorId: uuid }).strict(),
  z.object({ kind: z.literal("building"), buildingId: uuid }).strict(),
  z.object({ kind: z.literal("site") }).strict(),
]);

async function access(projectId: string) {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");
  const role = actor.role as UserRole;
  if (!canViewProgression(role)) throw new PublicError("You don't have access to this project.");
  const [canView, isConstruction] = await Promise.all([canViewProject(actor, projectId), isConstructionProjectForProgression(projectId)]);
  if (!canView) throw new PublicError("You don't have access to this project.");
  if (!isConstruction) throw new PublicError("Progression is for Construction Intelligence projects.");
  return { actor, role };
}

const fail = (scope: string, err: unknown, fallback: string) => {
  logServerError(`checklist:${scope}`, err);
  return { ok: false as const, error: getErrorMessage(err, fallback) };
};

// ------------------------------------------------------------------ read

export async function getChecklistOverview(projectId: string): Promise<Result<ChecklistOverview>> {
  try {
    if (!validate(uuid, projectId).success) return { ok: false, error: "Invalid project." };
    const { role } = await access(projectId);
    const data = await loadV2ProjectData(projectId);
    if (!data) return { ok: false, error: "Project not found." };
    const today = todayInIndia();
    const zones = new Map<string, number>();
    const zoneData = (await loadZoneData([projectId]).catch(() => new Map())).get(projectId);
    for (const [floorId, r] of zoneFloorResults(zoneData, today, data.verifiedOnly)) zones.set(floorId, r.percent);
    const r = v2CompletionFor(data, today, { zoneActual: zones });
    const floorPct = new Map(r.floors.map((f) => [f.floorId, f.actual]));
    const buildingPct = new Map(r.buildings.map((b) => [b.buildingId, b.actual]));
    return {
      ok: true,
      data: {
        projectId,
        version: data.version,
        canEdit: canEditProgression(role),
        canVerify: canVerifyProgression(role),
        canManage: canVerifyProgression(role),
        percent: r.actual,
        parts: { inside: r.parts.inside.actual, outside: r.parts.outside.actual, site: r.parts.site.actual },
        split: r.split,
        floors: data.floors.map((f) => ({ id: f.id, label: `${f.buildingName} · ${f.name}`, buildingName: f.buildingName, percent: floorPct.get(f.id) ?? 0 })),
        buildings: data.buildings.map((b) => ({ id: b.id, name: b.name, percent: buildingPct.get(b.id) ?? 0 })),
      },
    };
  } catch (err) {
    return fail("overview", err, "Could not load the checklist.");
  }
}

export async function getChecklist(input: { projectId: string; scope: ChecklistScope }): Promise<Result<ChecklistView>> {
  const scope = validate(scopeSchema, input?.scope);
  if (!validate(uuid, input?.projectId).success || !scope.success) return { ok: false, error: "Invalid checklist." };
  try {
    const admin = createServiceRoleClient();
    let q = admin.from("project_progressions").select("*").eq("project_id", input.projectId).is("deleted_at", null);
    const sc = scope.data;
    if (sc.kind === "floor") q = q.eq("floor_id", sc.floorId).in("track", ["pre_slab", "post_slab"]);
    else if (sc.kind === "building") q = q.eq("building_id", sc.buildingId).eq("track", "external" as never);
    else q = q.eq("track", "site" as never);
    // 360 scans for this scope (evidence is locked to the same floor / building / site).
    let scansQ = admin.from("project_tours").select("*").eq("project_id", input.projectId).is("deleted_at", null);
    if (sc.kind === "floor") scansQ = scansQ.eq("floor_id", sc.floorId);
    else if (sc.kind === "building") scansQ = scansQ.eq("building_id", sc.buildingId).is("floor_id", null);
    else scansQ = scansQ.is("floor_id", null).is("building_id", null);
    // One round trip: permission check, checklists and scans together.
    const [, { data: progs }, { data: scanRows }] = await Promise.all([access(input.projectId), q, scansQ]);
    const progRows = ((progs ?? []) as Array<{ id: string; track: string; template_id: string; planned_start_date: string | null; planned_end_date: string | null }>).sort(
      (a, b) => (a.track === "pre_slab" ? 0 : 1) - (b.track === "pre_slab" ? 0 : 1)
    );
    if (progRows.length === 0) return { ok: true, data: { title: "", percent: 0, lists: [], scans: [], phases: [], nextStepId: null } };
    const templateIds = [...new Set(progRows.map((p) => p.template_id))];
    const [{ data: steps }, { data: tpl }, { data: tplRows }] = await Promise.all([
      admin.from("project_progression_steps").select("*").in("progression_id", progRows.map((p) => p.id)),
      admin.from("progression_template_steps").select("*").in("template_id", templateIds),
      admin.from("progression_templates").select("id, name").in("id", templateIds),
    ]);
    const tplName = new Map(((tplRows ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
    const tplById = new Map(
      ((tpl ?? []) as Array<{ id: string; title: string; phase_number: number; phase_name: string; phase_weight?: number | null; photo_expected?: boolean; hidden_at?: string | null; step_number: number }>).map((t) => [t.id, t])
    );
    const stepRows = (steps ?? []) as Array<{
      id: string;
      progression_id: string;
      template_step_id: string;
      status: string;
      started_at: string | null;
      started_by: string | null;
      ended_at: string | null;
      ended_by: string | null;
      completed_at: string | null;
      completed_by: string | null;
      verification_status?: string | null;
      verified_by?: string | null;
      verification_note?: string | null;
      work_date?: string | null;
      note?: string | null;
      evidence_tour_id?: string | null;
      na?: boolean;
    }>;
    const userIds = [...new Set(stepRows.flatMap((s) => [s.started_by, s.ended_by ?? s.completed_by, s.verified_by ?? null]).filter(Boolean))] as string[];
    const scans: ChecklistScan[] = ((scanRows ?? []) as Array<{ id: string; name: string; capture_date: string | null; created_at: string; matterport_url: string; archived_at?: string | null }>)
      .filter((t) => !t.archived_at)
      .map((t) => ({ id: t.id, name: t.name, date: (t.capture_date ?? t.created_at)?.slice(0, 10) ?? null, url: t.matterport_url }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const evidenceIds = [...new Set(stepRows.map((s) => s.evidence_tour_id).filter(Boolean))] as string[];
    const missingEvidence = evidenceIds.filter((id) => !scans.some((sc2) => sc2.id === id));
    const [{ data: users }, photosRes, { data: extraScans }] = await Promise.all([
      userIds.length ? admin.from("users").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
      stepRows.length
        ? admin.from("step_photos" as never).select("step_id, kind").in("step_id", stepRows.map((s) => s.id))
        : Promise.resolve({ data: [], error: null }),
      missingEvidence.length
        ? admin.from("project_tours").select("id, name, matterport_url").in("id", missingEvidence)
        : Promise.resolve({ data: [] as { id: string; name: string; matterport_url: string }[] }),
    ]);
    const scanById = new Map<string, { id: string; name: string; url: string }>([
      ...scans.map((x) => [x.id, { id: x.id, name: x.name, url: x.url }] as const),
      ...((extraScans ?? []) as { id: string; name: string; matterport_url: string }[]).map((x) => [x.id, { id: x.id, name: x.name, url: x.matterport_url }] as const),
    ]);
    const name = new Map(((users ?? []) as { id: string; full_name: string | null }[]).map((u) => [u.id, u.full_name]));
    const photoCount = new Map<string, { start: number; end: number }>();
    for (const p of ((photosRes as { data: unknown }).data ?? []) as Array<{ step_id: string; kind: string }>) {
      const c = photoCount.get(p.step_id) ?? { start: 0, end: 0 };
      if (p.kind === "start") c.start += 1;
      else c.end += 1;
      photoCount.set(p.step_id, c);
    }

    const phases = new Map<string, ChecklistPhase & { order: number }>();
    for (const prog of progRows) {
      const own = stepRows
        .filter((s) => s.progression_id === prog.id)
        .map((s) => ({ s, t: tplById.get(s.template_step_id) }))
        .filter((x): x is { s: (typeof stepRows)[number]; t: NonNullable<ReturnType<typeof tplById.get>> } => Boolean(x.t && !x.t.hidden_at))
        .sort((a, b) => a.t.step_number - b.t.step_number);
      for (const { s, t } of own) {
        const key = `${prog.track}:${t.phase_number}`;
        const phase = phases.get(key) ?? {
          key,
          name: t.phase_name,
          weight: Number(t.phase_weight ?? 0),
          percent: null,
          steps: [],
          order: (prog.track === "pre_slab" ? 0 : 1000) + t.phase_number,
        };
        phase.steps.push({
          id: s.id,
          title: t.title,
          status: (s.status as ChecklistStep["status"]) ?? "pending",
          na: Boolean(s.na),
          photoExpected: Boolean(t.photo_expected),
          startedAt: s.started_at,
          startedBy: s.started_by ? (name.get(s.started_by) ?? null) : null,
          endedAt: s.ended_at ?? s.completed_at,
          endedBy: (s.ended_by ?? s.completed_by) ? (name.get((s.ended_by ?? s.completed_by)!) ?? null) : null,
          photos: photoCount.get(s.id) ?? { start: 0, end: 0 },
          verification: (s.verification_status as ChecklistStep["verification"]) ?? null,
          verifiedBy: s.verified_by ? (name.get(s.verified_by) ?? null) : null,
          verificationNote: s.verification_note ?? null,
          workDate: s.work_date ?? null,
          note: s.note ?? null,
          evidence: s.evidence_tour_id ? (scanById.get(s.evidence_tour_id) ?? null) : null,
        });
        phases.set(key, phase);
      }
    }
    const ordered = [...phases.values()].sort((a, b) => a.order - b.order);
    let wSum = 0;
    let vSum = 0;
    for (const ph of ordered) {
      const applicable = ph.steps.filter((s) => !s.na);
      if (applicable.length === 0) continue;
      ph.percent = (applicable.filter((s) => s.status === "completed").length / applicable.length) * 100;
      if (ph.weight > 0) {
        wSum += ph.weight;
        vSum += ph.weight * ph.percent;
      }
    }
    const all = ordered.flatMap((p) => p.steps).filter((s) => !s.na);
    const next = all.find((s) => s.status === "in_progress") ?? all.find((s) => s.status === "pending") ?? null;
    return {
      ok: true,
      data: {
        title: "",
        percent: wSum > 0 ? vSum / wSum : 0,
        lists: progRows.map((p) => {
          const own = ordered.filter((ph) => ph.key.startsWith(`${p.track}:`));
          let w = 0;
          let v = 0;
          for (const ph of own) {
            if (ph.percent == null || ph.weight <= 0) continue;
            w += ph.weight;
            v += ph.weight * ph.percent;
          }
          return {
            progressionId: p.id,
            templateId: p.template_id,
            name: tplName.get(p.template_id) ?? p.track,
            track: p.track,
            percent: w > 0 ? v / w : null,
            plannedStart: p.planned_start_date,
            plannedEnd: p.planned_end_date,
            plannedPercent: plannedPercent(todayInIndia(), p.planned_start_date, p.planned_end_date),
          };
        }),
        scans,
        phases: ordered.map(({ order: _o, ...p }) => p),
        nextStepId: next?.id ?? null,
      },
    };
  } catch (err) {
    return fail("read", err, "Could not load the checklist.");
  }
}

// ----------------------------------------------------------------- write

async function stepContext(projectId: string, stepId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("project_progression_steps")
    .select("*, progression:project_progressions!inner(id, project_id, floor_id, building_id, track, deleted_at), template_step:progression_template_steps(title)")
    .eq("id", stepId)
    .maybeSingle();
  const row = data as unknown as {
    id: string;
    status: string;
    na?: boolean;
    progression: { id: string; project_id: string; floor_id: string | null; building_id: string | null; track: string; deleted_at: string | null };
    template_step: { title: string } | null;
  } | null;
  if (!row || row.progression.project_id !== projectId || row.progression.deleted_at) return null;
  let where = "Site works";
  if (row.progression.floor_id) {
    const { data: f } = await admin.from("floors").select("name, building:buildings(name)").eq("id", row.progression.floor_id).maybeSingle();
    const fl = f as unknown as { name: string; building: { name: string } | null } | null;
    where = `${fl?.building?.name ?? "Building"} · ${fl?.name ?? "Floor"}`;
  } else if (row.progression.building_id) {
    const { data: b } = await admin.from("buildings").select("name").eq("id", row.progression.building_id).maybeSingle();
    where = `${(b as { name?: string } | null)?.name ?? "Building"} · Outside`;
  }
  return { row, where, title: row.template_step?.title ?? "Step" };
}

const actionSchema = z.object({ projectId: uuid, stepId: uuid, action: z.enum(["start", "done", "undo"]) }).strict();

/** Start → Done (and Undo one stage back). */
export async function checklistStepAction(input: unknown): Promise<Result<{ status: ChecklistStep["status"] }>> {
  const parsed = validate(actionSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, stepId, action } = parsed.data;
  try {
    const { actor, role } = await access(projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not update it.");
    const ctx = await stepContext(projectId, stepId);
    if (!ctx) return { ok: false, error: "Step not found." };
    if (ctx.row.na) return { ok: false, error: "This step is marked N/A here." };
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const today = todayInIndia();
    let patch: Record<string, unknown>;
    let next: ChecklistStep["status"];
    let from: ("pending" | "in_progress" | "completed")[];
    if (action === "start") {
      patch = { status: "in_progress", started_at: now, started_by: actor.userId, work_date: today };
      next = "in_progress";
      from = ["pending"];
    } else if (action === "done") {
      patch = { status: "completed", ended_at: now, ended_by: actor.userId, completed_at: now, completed_by: actor.userId, work_date: today, ...(ctx.row.status === "pending" ? { started_at: now, started_by: actor.userId } : {}) };
      next = "completed";
      from = ["pending", "in_progress"];
    } else {
      next = ctx.row.status === "completed" ? "in_progress" : "pending";
      patch =
        next === "in_progress"
          ? { status: "in_progress", ended_at: null, ended_by: null, completed_at: null, completed_by: null }
          : { status: "pending", started_at: null, started_by: null, work_date: null };
      from = ["in_progress", "completed"];
    }
    const { data: changed, error } = await admin.from("project_progression_steps").update(patch as never).eq("id", stepId).in("status", from).select("id");
    if (error) throw error;
    if (!changed?.length) return { ok: true, data: { status: ctx.row.status as ChecklistStep["status"] } };

    await admin.from("project_progression_logs").insert({
      progression_id: ctx.row.progression.id,
      step_id: stepId,
      action: action === "start" ? "started" : action === "done" ? "ended" : "reset",
      work_date: today,
      actor_id: actor.userId,
      note: null,
    });
    if (action !== "undo") {
      const { data: me } = await admin.from("users").select("full_name").eq("id", actor.userId).maybeSingle();
      await notifyProjectTeam({
        projectId,
        event: action === "start" ? "step_started" : "step_ended",
        actorId: actor.userId,
        title: `${ctx.where}: ${action === "start" ? "started" : "done"}`,
        message: `"${ctx.title}" ${action === "start" ? "started" : "marked done"} by ${(me?.full_name as string | null) ?? "a team member"}.`,
        link: `/dashboard/projects/${projectId}?tab=progression`,
        dedupeKey: `${stepId}:${action}`,
      });
    }
    return { ok: true, data: { status: next } };
  } catch (err) {
    return fail("action", err, "Could not update the step.");
  }
}

const naSchema = z.object({ projectId: uuid, stepId: uuid, na: z.boolean() }).strict();

/** Mark a step N/A on this floor / building (left out of the %). */
export async function setChecklistStepNa(input: unknown): Promise<Result<{ na: boolean }>> {
  const parsed = validate(naSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    const { role } = await access(parsed.data.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not update it.");
    const ctx = await stepContext(parsed.data.projectId, parsed.data.stepId);
    if (!ctx) return { ok: false, error: "Step not found." };
    const { error } = await createServiceRoleClient()
      .from("project_progression_steps")
      .update({ na: parsed.data.na } as never)
      .eq("id", parsed.data.stepId);
    if (error) throw error;
    return { ok: true, data: { na: parsed.data.na } };
  } catch (err) {
    return fail("na", err, "Could not change the step.");
  }
}

// ---------------------------------------------------------------- photos

const photoKind = z.enum(["start", "end", "other"]);
const uploadSchema = z.object({ projectId: uuid, stepId: uuid, kind: photoKind }).strict();

export async function createStepPhotoUpload(input: unknown): Promise<Result<{ path: string; token: string }>> {
  const parsed = validate(uploadSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    const { role } = await access(parsed.data.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not add photos.");
    if (!(await stepContext(parsed.data.projectId, parsed.data.stepId))) return { ok: false, error: "Step not found." };
    const path = `${parsed.data.projectId}/progress/${parsed.data.stepId}/${parsed.data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data, error } = await createServiceRoleClient().storage.from(STORAGE_BUCKETS.PROJECT_MEDIA).createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("No upload URL");
    return { ok: true, data: { path: data.path, token: data.token } };
  } catch (err) {
    return fail("photoUpload", err, "Could not start the photo upload.");
  }
}

const saveSchema = uploadSchema.extend({ path: z.string().min(10).max(400), width: z.number().int().positive().max(20000).optional(), height: z.number().int().positive().max(20000).optional() }).strict();

export async function saveStepPhoto(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = validate(saveSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const d = parsed.data;
  try {
    const { actor, role } = await access(d.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not add photos.");
    if (!d.path.startsWith(`${d.projectId}/progress/${d.stepId}/`)) return { ok: false, error: "Invalid photo." };
    const { data, error } = await createServiceRoleClient()
      .from("step_photos" as never)
      .insert({ step_id: d.stepId, project_id: d.projectId, kind: d.kind, path: d.path, width: d.width ?? null, height: d.height ?? null, uploaded_by: actor.userId } as never)
      .select("id")
      .single();
    if (error) {
      if (/step_photos/.test(error.message ?? "")) return { ok: false, error: "Photos need database migration 058. Ask BuildView to run it." };
      throw error;
    }
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (err) {
    return fail("photoSave", err, "Could not save the photo.");
  }
}

export type StepPhoto = { id: string; kind: "start" | "end" | "other"; url: string; createdAt: string; by: string | null };

export async function getStepPhotos(input: { projectId: string; stepId: string }): Promise<Result<StepPhoto[]>> {
  if (!validate(uuid, input?.projectId).success || !validate(uuid, input?.stepId).success) return { ok: false, error: "Invalid step." };
  try {
    await access(input.projectId);
    const admin = createServiceRoleClient();
    const { data } = await admin.from("step_photos" as never).select("*").eq("step_id", input.stepId).eq("project_id", input.projectId).order("created_at");
    const rows = (data ?? []) as unknown as Array<{ id: string; kind: StepPhoto["kind"]; path: string; created_at: string; uploaded_by: string | null }>;
    if (rows.length === 0) return { ok: true, data: [] };
    const { data: signed } = await admin.storage.from(STORAGE_BUCKETS.PROJECT_MEDIA).createSignedUrls(rows.map((r) => r.path), 3600);
    const ids = [...new Set(rows.map((r) => r.uploaded_by).filter(Boolean))] as string[];
    const { data: users } = ids.length ? await admin.from("users").select("id, full_name").in("id", ids) : { data: [] };
    const name = new Map(((users ?? []) as { id: string; full_name: string | null }[]).map((u) => [u.id, u.full_name]));
    return {
      ok: true,
      data: rows
        .map((r, i) => ({ id: r.id, kind: r.kind, url: signed?.[i]?.signedUrl ?? "", createdAt: r.created_at, by: r.uploaded_by ? (name.get(r.uploaded_by) ?? null) : null }))
        .filter((p) => p.url),
    };
  } catch (err) {
    return fail("photos", err, "Could not load photos.");
  }
}

// -------------------------------------------------------------- move to v2

/** Move a project to the v2 checklists (staff / Client Admin). Recorded work carries over. */
export async function moveProjectToV2(projectId: string): Promise<Result<{ created: number; switched: number; carried: number }>> {
  try {
    if (!validate(uuid, projectId).success) return { ok: false, error: "Invalid project." };
    const { actor, role } = await access(projectId);
    if (!isBuildViewStaffRole(role) && role !== "client_admin") throw new PublicError("Only BuildView staff or the Client Admin can switch checklists.");
    const { data, error } = await createServiceRoleClient().rpc("reconcile_progression_v2" as never, { p_project: projectId, p_actor: actor.userId } as never);
    if (error) {
      if (/reconcile_progression_v2/.test(error.message ?? "")) throw new PublicError("The new checklists need database migration 057. Run it in Supabase first.");
      throw error;
    }
    const row = (Array.isArray(data) ? data[0] : data) as { created: number; switched: number; carried: number } | undefined;
    await logAuditEvent({ action: "progression.moved_to_v2", entityType: "project", entityId: projectId, projectId, metadata: { created: row?.created ?? 0, switched: row?.switched ?? 0, carried: row?.carried ?? 0 } }).catch(() => undefined);
    return { ok: true, data: { created: Number(row?.created ?? 0), switched: Number(row?.switched ?? 0), carried: Number(row?.carried ?? 0) } };
  } catch (err) {
    return fail("moveV2", err, "Could not switch to the new checklists.");
  }
}

// ---------------------------------------------------------- step details

const detailsSchema = z
  .object({
    projectId: uuid,
    stepId: uuid,
    note: z.string().trim().max(1000).nullable().optional(),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strict();

/** Note and the day the work was done (editors). */
export async function updateChecklistStep(input: unknown): Promise<Result<{ ok: true }>> {
  const parsed = validate(detailsSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const d = parsed.data;
  try {
    const { role } = await access(d.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not update it.");
    if (!(await stepContext(d.projectId, d.stepId))) return { ok: false, error: "Step not found." };
    if (d.workDate && d.workDate > todayInIndia()) return { ok: false, error: "The date can't be in the future." };
    const patch: Record<string, unknown> = {};
    if (d.note !== undefined) patch.note = d.note || null;
    if (d.workDate !== undefined) patch.work_date = d.workDate;
    if (Object.keys(patch).length === 0) return { ok: true, data: { ok: true } };
    const { error } = await createServiceRoleClient().from("project_progression_steps").update(patch as never).eq("id", d.stepId);
    if (error) throw error;
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return fail("details", err, "Could not save the change.");
  }
}

const verifySchema = z.object({ projectId: uuid, stepId: uuid, decision: z.enum(["verified", "rejected"]), note: z.string().trim().max(500).nullable().optional() }).strict();

/** Verify or reject a done step (staff / Client Admin). The person who did it is told. */
export async function verifyChecklistStep(input: unknown): Promise<Result<{ ok: true }>> {
  const parsed = validate(verifySchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const d = parsed.data;
  try {
    const { actor, role } = await access(d.projectId);
    if (!canVerifyProgression(role)) throw new PublicError("Only BuildView staff or the Client Admin can verify.");
    const ctx = await stepContext(d.projectId, d.stepId);
    if (!ctx) return { ok: false, error: "Step not found." };
    if (ctx.row.status !== "completed") return { ok: false, error: "Only done steps can be verified." };
    if (d.decision === "rejected" && !d.note) return { ok: false, error: "Say what needs fixing." };
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("project_progression_steps")
      .update({ verification_status: d.decision, verified_by: actor.userId, verified_at: new Date().toISOString(), verification_note: d.note ?? null } as never)
      .eq("id", d.stepId);
    if (error) throw error;
    await admin.from("project_progression_logs").insert({
      progression_id: ctx.row.progression.id,
      step_id: d.stepId,
      action: d.decision,
      work_date: todayInIndia(),
      actor_id: actor.userId,
      note: d.note ?? null,
    } as never);
    const { data: row } = await admin.from("project_progression_steps").select("ended_by, completed_by").eq("id", d.stepId).maybeSingle();
    const doneBy = (row?.ended_by ?? row?.completed_by) as string | null | undefined;
    if (doneBy) {
      await notifyProjectTeam({
        projectId: d.projectId,
        event: "step_reviewed",
        actorId: actor.userId,
        recipients: [doneBy],
        title: `${ctx.where}: step ${d.decision}`,
        message: `"${ctx.title}" was ${d.decision}${d.note ? `: ${d.note}` : "."}`,
        link: `/dashboard/projects/${d.projectId}?tab=progression`,
      });
    }
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return fail("verify", err, "Could not save the review.");
  }
}

const evidenceSchema = z.object({ projectId: uuid, stepId: uuid, tourId: uuid.nullable() }).strict();

/** Link (or clear) a 360 scan of the same floor / building / site as evidence. */
export async function setChecklistEvidence(input: unknown): Promise<Result<{ ok: true }>> {
  const parsed = validate(evidenceSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const d = parsed.data;
  try {
    const { role } = await access(d.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not update it.");
    const ctx = await stepContext(d.projectId, d.stepId);
    if (!ctx) return { ok: false, error: "Step not found." };
    const admin = createServiceRoleClient();
    if (d.tourId) {
      const { data: tour } = await admin.from("project_tours").select("id, floor_id, building_id, project_id").eq("id", d.tourId).is("deleted_at", null).maybeSingle();
      const t = tour as { floor_id: string | null; building_id: string | null; project_id: string } | null;
      const prog = ctx.row.progression;
      const sameScope =
        t &&
        t.project_id === d.projectId &&
        (prog.floor_id ? t.floor_id === prog.floor_id : prog.building_id ? t.building_id === prog.building_id && !t.floor_id : !t.floor_id && !t.building_id);
      if (!sameScope) return { ok: false, error: "Pick a scan of this floor / building." };
    }
    const { error } = await admin.from("project_progression_steps").update({ evidence_tour_id: d.tourId } as never).eq("id", d.stepId);
    if (error) throw error;
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return fail("evidence", err, "Could not link the scan.");
  }
}

const scheduleSchema = z
  .object({
    projectId: uuid,
    progressionId: uuid,
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
  .strict()
  .refine((v) => !v.start || !v.end || v.end >= v.start, "The end date must be after the start.");

/** Planned start / end of one list (Structure, Finishing, Outside or Site). */
export async function setChecklistSchedule(input: unknown): Promise<Result<{ ok: true }>> {
  const parsed = validate(scheduleSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const d = parsed.data;
  try {
    const { actor, role } = await access(d.projectId);
    if (!canEditProgression(role)) throw new PublicError("You can view progress but not plan it.");
    const { error } = await createServiceRoleClient()
      .from("project_progressions")
      .update({ planned_start_date: d.start, planned_end_date: d.end, updated_by: actor.userId } as never)
      .eq("id", d.progressionId)
      .eq("project_id", d.projectId);
    if (error) throw error;
    return { ok: true, data: { ok: true } };
  } catch (err) {
    return fail("schedule", err, "Could not save the dates.");
  }
}
