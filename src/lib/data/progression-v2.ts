import "server-only";

import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  normaliseSplit,
  v2ProjectCompletion,
  type Split,
  type V2Checklist,
  type V2Result,
} from "@/lib/progression/v2-completion";

/**
 * Progression v2 data: a project's Inside / Outside / Site checklists with
 * phase weights, read in one pass. Callers check access first.
 */

export type V2ProjectData = {
  version: number;
  split: Split;
  verifiedOnly: boolean;
  floors: { id: string; name: string; buildingId: string; buildingName: string; sortKey: string }[];
  buildings: { id: string; name: string }[];
  checklists: (V2Checklist & { id: string })[];
};

/** Project's progression version (1 = original lists, 2 = v2). 1 before migration 057. */
export async function getProgressionVersion(projectId: string): Promise<number> {
  const { data } = await createServiceRoleClient().from("projects").select("*").eq("id", projectId).maybeSingle();
  return Number((data as { progression_version?: number } | null)?.progression_version ?? 1);
}

export const loadV2ProjectData = cache(async (projectId: string): Promise<V2ProjectData | null> => {
  const admin = createServiceRoleClient();
  const [{ data: project }, { data: buildings }, { data: progressions }] = await Promise.all([
    admin.from("projects").select("*").eq("id", projectId).maybeSingle(),
    admin.from("buildings").select("id, name, sort_order").eq("project_id", projectId).is("deleted_at", null).order("sort_order").order("name"),
    admin
      .from("project_progressions")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null),
  ]);
  if (!project) return null;
  const p = project as { progression_version?: number; progress_split?: unknown; progress_verified_only?: boolean };
  const buildingRows = (buildings ?? []) as { id: string; name: string; sort_order: number }[];
  const { data: floors } = buildingRows.length
    ? await admin
        .from("floors")
        .select("id, name, building_id, sort_order")
        .in("building_id", buildingRows.map((b) => b.id))
        .is("deleted_at", null)
        .order("sort_order")
        .order("name")
    : { data: [] as { id: string; name: string; building_id: string; sort_order: number }[] };
  const buildingName = new Map(buildingRows.map((b) => [b.id, b.name]));
  const buildingOrder = new Map(buildingRows.map((b, i) => [b.id, i]));

  const progRows = (progressions ?? []) as Array<{
    id: string;
    floor_id: string | null;
    building_id: string | null;
    track: string;
    template_id: string;
    planned_start_date: string | null;
    planned_end_date: string | null;
  }>;
  const progIds = progRows.map((r) => r.id);
  const templateIds = [...new Set(progRows.map((r) => r.template_id))];

  const [stepsRes, tplRes] = await Promise.all([
    progIds.length
      ? fetchAllRows((a, b) =>
          admin
            .from("project_progression_steps")
            .select("*")
            .in("progression_id", progIds)
            .order("id")
            .range(a, b)
        )
      : Promise.resolve({ data: [] as unknown[], error: null }),
    templateIds.length
      ? admin.from("progression_template_steps").select("*").in("template_id", templateIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const tplSteps = new Map(
    ((tplRes.data ?? []) as Array<{ id: string; phase_number: number; phase_weight?: number | null; hidden_at?: string | null }>).map((t) => [t.id, t])
  );

  const stepsByProg = new Map<string, unknown[]>();
  for (const s of stepsRes.data as Array<{ progression_id: string }>) {
    stepsByProg.set(s.progression_id, [...(stepsByProg.get(s.progression_id) ?? []), s]);
  }

  const checklists: V2ProjectData["checklists"] = progRows.map((r) => {
    const phases = new Map<number, { number: number; weight: number; steps: V2Checklist["phases"][number]["steps"] }>();
    for (const raw of (stepsByProg.get(r.id) ?? []) as Array<{
      template_step_id: string;
      status: string;
      work_date: string | null;
      ended_at: string | null;
      completed_at: string | null;
      verification_status?: string | null;
      na?: boolean | null;
    }>) {
      const t = tplSteps.get(raw.template_step_id);
      if (!t || t.hidden_at) continue;
      const phase = phases.get(t.phase_number) ?? { number: t.phase_number, weight: Number(t.phase_weight ?? 0), steps: [] };
      phase.steps.push({
        status: (raw.status as "pending" | "in_progress" | "completed") ?? "pending",
        doneDate: raw.work_date ?? (raw.ended_at ?? raw.completed_at)?.slice(0, 10) ?? null,
        verified: raw.verification_status === "verified",
        na: Boolean(raw.na),
      });
      phases.set(t.phase_number, phase);
    }
    return {
      id: r.id,
      scope: r.track === "external" ? "building" : r.track === "site" ? "site" : "floor",
      floorId: r.floor_id,
      buildingId: r.building_id,
      track: r.track,
      plannedStart: r.planned_start_date,
      plannedEnd: r.planned_end_date,
      phases: [...phases.values()].sort((a, b) => a.number - b.number),
    };
  });

  return {
    version: Number(p.progression_version ?? 1),
    split: normaliseSplit(p.progress_split),
    verifiedOnly: p.progress_verified_only === true,
    buildings: buildingRows.map((b) => ({ id: b.id, name: b.name })),
    floors: ((floors ?? []) as { id: string; name: string; building_id: string; sort_order: number }[])
      .map((f) => ({
        id: f.id,
        name: f.name,
        buildingId: f.building_id,
        buildingName: buildingName.get(f.building_id) ?? "Building",
        sortKey: `${String(buildingOrder.get(f.building_id) ?? 0).padStart(4, "0")}:${String(f.sort_order).padStart(6, "0")}`,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    checklists,
  };
});

/** v2 completion for a project on a date (zones override a floor's Inside %). */
export function v2CompletionFor(
  data: V2ProjectData,
  date: string,
  options: { asOf?: boolean; zoneActual?: Map<string, number>; zonePlanned?: Map<string, number> } = {}
): V2Result {
  return v2ProjectCompletion({
    checklists: data.checklists,
    floorIds: data.floors.map((f) => f.id),
    buildingIds: data.buildings.map((b) => b.id),
    split: data.split,
    date,
    verifiedOnly: data.verifiedOnly,
    asOf: options.asOf,
    zoneActual: options.zoneActual,
    zonePlanned: options.zonePlanned,
  });
}
