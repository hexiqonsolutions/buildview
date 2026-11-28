import "server-only";

import { cache } from "react";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { canViewProgression } from "@/lib/auth/roles";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import {
  getCompletionHistory,
  getProjectProgressionFresh,
  isConstructionProjectForProgression,
} from "@/lib/data/progression";
import { getZoneProgress, type ZoneProgressView } from "@/lib/actions/zone-progress";
import { type ProgressionTrack } from "@/lib/progression/catalog";
import { trackLabel, type ConstructionMethod } from "@/lib/progression/methods";
import { todayInIndia } from "@/lib/progression/checklist-completion";
import type { CompletionSummary } from "@/lib/progression/completion";
import type { SCurvePoint } from "@/lib/progression/s-curve";
import type { ProgressionScan } from "@/lib/progression/types";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

/**
 * PDF progress report (Milestone 7): everything the printable report shows,
 * read through the same formula and loaders as the Progression tab so the
 * numbers match the screen.
 */

export type ReportEvidence = { name: string; date: string | null; url: string };

export type ReportFloorRow = {
  floorId: string;
  building: string;
  floor: string;
  summary: CompletionSummary;
  basis: "zones" | "checklist";
  latestScan: ReportEvidence | null;
  method: ConstructionMethod;
};

export type ReportChange = {
  date: string;
  kind: "step" | "zone";
  where: string;
  what: string;
  status: "verified" | "rejected" | "pending";
  evidence: ReportEvidence | null;
};

export type ProgressReport = {
  project: { id: string; name: string; location: string | null; clientName: string | null };
  from: string;
  to: string;
  generatedOn: string;
  summary: CompletionSummary;
  floorCount: number;
  scheduledFloorCount: number;
  unstartedFloorCount: number;
  verifiedOnly: boolean;
  pendingReviewCount: number;
  floors: ReportFloorRow[];
  history: SCurvePoint[];
  zones: Extract<ZoneProgressView, { available: true }> | null;
  /** Totals over every change in the period (the list below may be cut). */
  changeCounts: { steps: number; zoneUpdates: number; notVerified: number };
  changes: ReportChange[];
  changesTruncated: boolean;
  /** v2: Inside / Outside / Site split and their %. */
  parts: { inside: number; outside: number; site: number; split: { inside: number; outside: number; site: number } } | null;
  /** Latest step photos in the period (before / after). */
  photos: { url: string; kind: "start" | "end" | "other"; title: string; where: string; date: string }[];
};

const MAX_CHANGES = 300;
const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

function scanEvidence(scan: ProgressionScan | undefined): ReportEvidence | null {
  if (!scan) return null;
  return { name: scan.name, date: day(scan.captureDate) ?? day(scan.createdAt), url: scan.matterportUrl };
}

export type ReportResult =
  | { ok: true; report: ProgressReport }
  | { ok: false; reason: "signin" | "forbidden" | "unavailable" | "invalid" };

/** Cached per request: the page title and body share one load. */
export const getProgressReport = cache(loadProgressReport);

async function loadProgressReport(projectId: string, from: string, to: string): Promise<ReportResult> {
  if (!validate(projectIdSchema, projectId).success) return { ok: false, reason: "invalid" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return { ok: false, reason: "invalid" };
  }

  const actor = await getActiveActor();
  if (!actor) return { ok: false, reason: "signin" };
  if (!canViewProgression(actor.role)) return { ok: false, reason: "forbidden" };
  if (!(await canViewProject({ userId: actor.userId, role: actor.role, clientId: actor.clientId }, projectId))) {
    return { ok: false, reason: "forbidden" };
  }
  if (!(await isConstructionProjectForProgression(projectId))) return { ok: false, reason: "unavailable" };

  const admin = createServiceRoleClient();
  const stepRowsPromise = fetchAllRows((a, b) =>
    admin
      .from("project_progression_steps")
      .select(
        "status, ended_at, completed_at, work_date, evidence_tour_id, verification_status, template_step:progression_template_steps(title, phase_name), progression:project_progressions!inner(project_id, floor_id, track, deleted_at)"
      )
      .eq("progression.project_id", projectId)
      .is("progression.deleted_at", null)
      .eq("status", "completed")
      .order("id")
      .range(a, b)
  );
  const obsRowsPromise = fetchAllRows((a, b) =>
    admin
      .from("progress_observations" as never)
      .select("*")
      .eq("project_id", projectId)
      .gte("observed_on", from)
      .lte("observed_on", to)
      .order("id")
      .range(a, b)
  );
  const [bundle, history, zoneView, projectRes] = await Promise.all([
    getProjectProgressionFresh(projectId),
    getCompletionHistory(projectId).catch(() => null),
    getZoneProgress(projectId).catch(() => null),
    admin.from("projects").select("id, name, location, client_name").eq("id", projectId).maybeSingle(),
  ]);
  const project = projectRes.data;
  if (!bundle || !project) return { ok: false, reason: "unavailable" };

  const zones = zoneView && zoneView.available ? zoneView : null;
  const scanById = new Map(bundle.scans.map((s) => [s.id, s]));
  const scanDate = (s: ProgressionScan) => day(s.captureDate) ?? day(s.createdAt) ?? "";

  // ---- floors: same per-floor results as the Completion card
  const resultByFloor = new Map(bundle.completion.floors.map((f) => [f.floorId, f]));
  const floors: ReportFloorRow[] = bundle.combinedFloors.map((f) => {
    const result = resultByFloor.get(f.floorId);
    const latest = bundle.scans
      .filter((s) => s.floorId === f.floorId)
      .sort((a, b) => scanDate(b).localeCompare(scanDate(a)))[0];
    return {
      floorId: f.floorId,
      building: f.buildingName,
      floor: f.floorName,
      summary: result?.summary ?? {
        actual: 0,
        planned: null,
        variance: null,
        behind: null,
        status: "no_schedule",
      },
      basis: bundle.zoneFloorPercents[f.floorId] != null ? "zones" : "checklist",
      method: f.method,
      latestScan: scanEvidence(latest),
    };
  });
  const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  floors.sort((a, b) => byName.compare(a.building, b.building) || byName.compare(a.floor, b.floor));
  const methodByFloor = new Map(floors.map((f) => [f.floorId, f.method]));
  const floorLabel = new Map(floors.map((f) => [f.floorId, `${f.building} · ${f.floor}`]));

  // ---- changes in the period: checklist steps ended + zone updates
  const changes: ReportChange[] = [];

  type StepRow = {
    status: string;
    ended_at: string | null;
    completed_at: string | null;
    work_date: string | null;
    evidence_tour_id?: string | null;
    verification_status?: string | null;
    template_step: { title: string; phase_name: string } | null;
    progression: { floor_id: string; track: string } | null;
  };
  const { data: stepRows } = await stepRowsPromise;
  for (const s of (stepRows ?? []) as unknown as StepRow[]) {
    const date = day(s.work_date) ?? day(s.ended_at) ?? day(s.completed_at);
    if (!date || date < from || date > to || !s.progression) continue;
    const track = trackLabel(
      s.progression.track as ProgressionTrack,
      methodByFloor.get(s.progression.floor_id) ?? "conventional"
    );
    changes.push({
      date,
      kind: "step",
      where: floorLabel.get(s.progression.floor_id) ?? "Floor",
      what: `${track}: ${s.template_step?.title ?? "Step"} ended`,
      status: s.verification_status === "verified" ? "verified" : s.verification_status === "rejected" ? "rejected" : "pending",
      evidence: s.evidence_tour_id ? scanEvidence(scanById.get(s.evidence_tour_id)) : null,
    });
  }

  if (zones) {
    const zoneInfo = new Map<string, { name: string; floorId: string }>();
    for (const f of zones.floors) for (const z of f.zones) zoneInfo.set(z.id, { name: z.name, floorId: f.floorId });
    const activityName = new Map(zones.activities.map((a) => [a.key, a.name]));
    const stageName = new Map(zones.stages.map((st) => [st.key, st.name]));
    const { data: obsRows } = await obsRowsPromise;
    for (const o of (obsRows ?? []) as unknown as Array<{
      zone_id: string;
      activity_key: string;
      stage_key: string;
      observed_on: string;
      evidence_tour_id: string | null;
      verification_status: string | null;
    }>) {
      const zone = zoneInfo.get(o.zone_id);
      if (!zone) continue;
      changes.push({
        date: o.observed_on,
        kind: "zone",
        where: `${floorLabel.get(zone.floorId) ?? "Floor"} · ${zone.name}`,
        what: `${activityName.get(o.activity_key) ?? o.activity_key} → ${stageName.get(o.stage_key) ?? o.stage_key}`,
        status: o.verification_status === "verified" ? "verified" : o.verification_status === "rejected" ? "rejected" : "pending",
        evidence: o.evidence_tour_id ? scanEvidence(scanById.get(o.evidence_tour_id)) : null,
      });
    }
  }
  changes.sort((a, b) => b.date.localeCompare(a.date) || a.where.localeCompare(b.where));

  return {
    ok: true,
    report: {
      project: {
        id: project.id,
        name: project.name,
        location: project.location ?? null,
        clientName: project.client_name ?? null,
      },
      from,
      to,
      generatedOn: todayInIndia(),
      summary: bundle.completion.summary,
      floorCount: bundle.completion.floorCount,
      scheduledFloorCount: bundle.completion.scheduledFloorCount,
      unstartedFloorCount: bundle.completion.floors.filter((f) => f.actual <= 0).length,
      verifiedOnly: bundle.verifiedOnly,
      pendingReviewCount: bundle.pendingReviewCount,
      floors,
      history: history?.points ?? [],
      zones,
      changeCounts: {
        steps: changes.filter((c) => c.kind === "step").length,
        zoneUpdates: changes.filter((c) => c.kind === "zone").length,
        notVerified: changes.filter((c) => c.status === "pending").length,
      },
      changes: changes.slice(0, MAX_CHANGES),
      parts:
        "parts" in bundle.completion
          ? {
              inside: bundle.completion.parts.inside.actual,
              outside: bundle.completion.parts.outside.actual,
              site: bundle.completion.parts.site.actual,
              split: bundle.completion.split,
            }
          : null,
      photos: await periodPhotos(projectId, from, to),
      changesTruncated: changes.length > MAX_CHANGES,
    },
  };
}

/** Up to 12 recent step photos in the period, with where and what. */
async function periodPhotos(projectId: string, from: string, to: string): Promise<ProgressReport["photos"]> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("step_photos" as never)
      .select("path, kind, created_at, step:project_progression_steps(template_step:progression_template_steps(title), progression:project_progressions(floor_id, building_id, track))")
      .eq("project_id", projectId)
      .gte("created_at", `${from}T00:00:00+05:30`)
      .lte("created_at", `${to}T23:59:59+05:30`)
      .order("created_at", { ascending: false })
      .limit(12);
    const rows = (data ?? []) as unknown as Array<{
      path: string;
      kind: "start" | "end" | "other";
      created_at: string;
      step: { template_step: { title: string } | null; progression: { floor_id: string | null; building_id: string | null; track: string } | null } | null;
    }>;
    if (rows.length === 0) return [];
    const { data: signed } = await admin.storage.from("project-media").createSignedUrls(rows.map((r) => r.path), 7 * 24 * 3600);
    const floorIds = [...new Set(rows.map((r) => r.step?.progression?.floor_id).filter(Boolean))] as string[];
    const buildingIds = [...new Set(rows.map((r) => r.step?.progression?.building_id).filter(Boolean))] as string[];
    const [{ data: floors }, { data: buildings }] = await Promise.all([
      floorIds.length ? admin.from("floors").select("id, name, building_id").in("id", floorIds) : Promise.resolve({ data: [] }),
      buildingIds.length ? admin.from("buildings").select("id, name").in("id", buildingIds) : Promise.resolve({ data: [] }),
    ]);
    const bName = new Map(((buildings ?? []) as { id: string; name: string }[]).map((b) => [b.id, b.name]));
    const fLabel = new Map(((floors ?? []) as { id: string; name: string; building_id: string }[]).map((f) => [f.id, `${bName.get(f.building_id) ?? ""} · ${f.name}`.replace(/^ · /, "")]));
    return rows
      .map((r, i) => {
        const prog = r.step?.progression;
        const where = prog?.floor_id ? (fLabel.get(prog.floor_id) ?? "Floor") : prog?.track === "site" ? "Site works" : `${bName.get(prog?.building_id ?? "") ?? "Building"} · Outside`;
        return { url: signed?.[i]?.signedUrl ?? "", kind: r.kind, title: r.step?.template_step?.title ?? "Step", where, date: r.created_at.slice(0, 10) };
      })
      .filter((p) => p.url);
  } catch {
    return [];
  }
}
