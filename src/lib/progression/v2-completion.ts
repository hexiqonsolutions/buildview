import { plannedPercent, summarize, weightedRollup, type CompletionSummary } from "@/lib/progression/completion";
import type { FloorCompletion, ProjectCompletion } from "@/lib/progression/checklist-completion";

/**
 * Progression v2 % (pure, tested).
 *
 *   phase %     = steps done ÷ applicable steps (N/A and hidden left out)
 *   checklist % = Σ phase% × phase weight ÷ Σ weights of phases with steps
 *   floor %     = Inside: structure + finishing checklists together, by weight
 *   project %   = Inside × split.inside + Outside × split.outside + Site × split.site
 *                 (parts with weight 0 are left out and the rest renormalised)
 *   unstarted floors / buildings count as 0%.
 */

export type V2StepRecord = {
  status: "pending" | "in_progress" | "completed";
  /** Day it was ended (YYYY-MM-DD), for history. */
  doneDate: string | null;
  verified: boolean;
  na: boolean;
};

export type V2Phase = { number: number; weight: number; steps: V2StepRecord[] };

export type V2Checklist = {
  scope: "floor" | "building" | "site";
  floorId: string | null;
  buildingId: string | null;
  track: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  phases: V2Phase[];
};

export type Split = { inside: number; outside: number; site: number };

function stepDone(step: V2StepRecord, date: string | null, verifiedOnly: boolean): boolean {
  if (step.status !== "completed") return false;
  if (verifiedOnly && !step.verified) return false;
  if (date && step.doneDate && step.doneDate > date) return false;
  return true;
}

/** Weighted parts of a set of checklists (one floor's Inside, one building's Outside…). */
function weightedParts(lists: V2Checklist[], date: string | null, verifiedOnly: boolean) {
  const parts: { percent: number; weight: number }[] = [];
  for (const cl of lists) {
    for (const phase of cl.phases) {
      const applicable = phase.steps.filter((s) => !s.na);
      if (applicable.length === 0 || phase.weight <= 0) continue;
      const done = applicable.filter((s) => stepDone(s, date, verifiedOnly)).length;
      parts.push({ percent: (done / applicable.length) * 100, weight: phase.weight });
    }
  }
  return parts;
}

/** % of a group of checklists, or null when they have no applicable steps. */
export function groupPercent(lists: V2Checklist[], date: string | null = null, verifiedOnly = false): number | null {
  return weightedRollup(weightedParts(lists, date, verifiedOnly));
}

/** Planned % of a group: each checklist's date line, weighted by its phase weights. */
export function groupPlanned(lists: V2Checklist[], date: string): number | null {
  return weightedRollup(
    lists.map((cl) => ({
      percent: plannedPercent(date, cl.plannedStart, cl.plannedEnd),
      weight: cl.phases.reduce((sum, p) => sum + (p.steps.some((s) => !s.na) ? p.weight : 0), 0),
    }))
  );
}

export function normaliseSplit(raw: unknown): Split {
  const r = (raw ?? {}) as Partial<Record<keyof Split, unknown>>;
  const num = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  return { inside: num(r.inside, 70), outside: num(r.outside, 20), site: num(r.site, 10) };
}

export type V2Result = ProjectCompletion & {
  parts: {
    inside: { actual: number; planned: number | null };
    outside: { actual: number; planned: number | null };
    site: { actual: number; planned: number | null };
  };
  split: Split;
  buildings: { buildingId: string; actual: number; planned: number | null }[];
};

/**
 * Project completion for a v2 project on `date`.
 * `zoneActual` / `zonePlanned` replace a floor's Inside % when the floor has zones.
 */
export function v2ProjectCompletion(input: {
  checklists: V2Checklist[];
  floorIds: string[];
  buildingIds: string[];
  split: Split;
  date: string;
  verifiedOnly?: boolean;
  /** Ignore work ended after `date` (history / S-curve). */
  asOf?: boolean;
  zoneActual?: Map<string, number>;
  zonePlanned?: Map<string, number>;
}): V2Result {
  const { checklists, date } = input;
  const verifiedOnly = input.verifiedOnly ?? false;
  const cutoff = input.asOf ? date : null;

  const floors: FloorCompletion[] = input.floorIds.map((floorId) => {
    const lists = checklists.filter((c) => c.scope === "floor" && c.floorId === floorId);
    const actual = input.zoneActual?.get(floorId) ?? groupPercent(lists, cutoff, verifiedOnly) ?? 0;
    const planned = input.zonePlanned?.get(floorId) ?? groupPlanned(lists, date);
    return { floorId, actual, planned, summary: summarize(actual, planned) };
  });
  const buildings = input.buildingIds.map((buildingId) => {
    const lists = checklists.filter((c) => c.scope === "building" && c.buildingId === buildingId);
    return { buildingId, actual: groupPercent(lists, cutoff, verifiedOnly) ?? 0, planned: groupPlanned(lists, date) };
  });
  const siteLists = checklists.filter((c) => c.scope === "site");

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgPlanned = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  const inside = { actual: avg(floors.map((f) => f.actual)) ?? 0, planned: avgPlanned(floors.map((f) => f.planned)) };
  const outside = { actual: avg(buildings.map((b) => b.actual)) ?? 0, planned: avgPlanned(buildings.map((b) => b.planned)) };
  const site = {
    actual: siteLists.length ? (groupPercent(siteLists, cutoff, verifiedOnly) ?? 0) : 0,
    planned: siteLists.length ? groupPlanned(siteLists, date) : null,
  };

  const split = input.split;
  const present = {
    inside: floors.length > 0 && split.inside > 0,
    outside: buildings.length > 0 && split.outside > 0,
    site: siteLists.length > 0 && split.site > 0,
  };
  const actual =
    weightedRollup([
      present.inside ? { percent: inside.actual, weight: split.inside } : null,
      present.outside ? { percent: outside.actual, weight: split.outside } : null,
      present.site ? { percent: site.actual, weight: split.site } : null,
    ].filter((x): x is { percent: number; weight: number } => x != null)) ?? 0;
  const planned = weightedRollup(
    [
      present.inside && inside.planned != null ? { percent: inside.planned, weight: split.inside } : null,
      present.outside && outside.planned != null ? { percent: outside.planned, weight: split.outside } : null,
      present.site && site.planned != null ? { percent: site.planned, weight: split.site } : null,
    ].filter((x): x is { percent: number; weight: number } => x != null)
  );

  // Variance/status compare the scheduled parts' actual with their planned.
  const scheduledActual = weightedRollup(
    [
      present.inside && inside.planned != null ? { percent: inside.actual, weight: split.inside } : null,
      present.outside && outside.planned != null ? { percent: outside.actual, weight: split.outside } : null,
      present.site && site.planned != null ? { percent: site.actual, weight: split.site } : null,
    ].filter((x): x is { percent: number; weight: number } => x != null)
  );
  const base: CompletionSummary = summarize(scheduledActual ?? actual, planned);

  return {
    actual,
    planned,
    summary: { ...base, actual },
    floorCount: floors.length,
    scheduledFloorCount: floors.filter((f) => f.planned != null).length,
    floors,
    parts: { inside, outside, site },
    split,
    buildings,
  };
}
