import {
  plannedPercent,
  summarize,
  weightedRollup,
  type CompletionSummary,
} from "@/lib/progression/completion";

/**
 * Adapter: today's Pre-Slab / Post-Slab checklists → the Definable Completion
 * formula. Pure (no DB) so it is shared by the project bundle, the multi-project
 * list and tests.
 *
 * Mapping (documented in docs/progression-audit.md §8):
 *   - each track on a floor is an activity, weighted by its number of steps
 *     (so every step still counts equally, matching the previous floor %);
 *   - a floor is one zone; floors roll up with equal weight (no areas yet);
 *   - floors that have not started count as 0%.
 */

export type ChecklistTrackInput = {
  completed: number;
  total: number;
  plannedStart: string | null;
  plannedEnd: string | null;
};

export type ChecklistFloorInput = {
  floorId: string;
  tracks: ChecklistTrackInput[];
  /**
   * Floor % from its zones (Milestone 4). When set, it replaces the checklist
   * % for this floor; the schedule still comes from the tracks.
   */
  zoneActual?: number | null;
};

/** Steps per track when a track has not been seeded yet. */
const DEFAULT_TRACK_STEPS = 56;

export type FloorCompletion = {
  floorId: string;
  actual: number;
  planned: number | null;
  summary: CompletionSummary;
};

export type ProjectCompletion = {
  /** Actual % across every floor (unstarted floors = 0). */
  actual: number;
  /** Planned % across floors that have a schedule; null when none do. */
  planned: number | null;
  /** Variance and status compare the scheduled floors only. */
  summary: CompletionSummary;
  floorCount: number;
  scheduledFloorCount: number;
  floors: FloorCompletion[];
};

export function floorCompletion(floor: ChecklistFloorInput, today: string): FloorCompletion {
  const actual =
    floor.zoneActual != null
      ? floor.zoneActual
      : (weightedRollup(
          floor.tracks.map((t) => ({
            percent: t.total > 0 ? (t.completed / t.total) * 100 : null,
            weight: t.total,
          }))
        ) ?? 0);
  const planned = weightedRollup(
    floor.tracks.map((t) => ({
      percent: plannedPercent(today, t.plannedStart, t.plannedEnd),
      weight: t.total > 0 ? t.total : DEFAULT_TRACK_STEPS,
    }))
  );
  return { floorId: floor.floorId, actual, planned, summary: summarize(actual, planned) };
}

export function projectCompletion(floors: ChecklistFloorInput[], today: string): ProjectCompletion {
  const perFloor = floors.map((f) => floorCompletion(f, today));
  const actual = weightedRollup(perFloor.map((f) => ({ percent: f.actual, weight: 1 }))) ?? 0;
  const scheduled = perFloor.filter((f) => f.planned != null);
  const planned = weightedRollup(scheduled.map((f) => ({ percent: f.planned, weight: 1 })));
  const scheduledActual =
    weightedRollup(scheduled.map((f) => ({ percent: f.actual, weight: 1 }))) ?? 0;
  const base = summarize(scheduled.length > 0 ? scheduledActual : actual, planned);
  return {
    actual,
    planned,
    summary: { ...base, actual },
    floorCount: floors.length,
    scheduledFloorCount: scheduled.length,
    floors: perFloor,
  };
}

/** Today as YYYY-MM-DD in India time (site work is logged in IST). */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Progress on a date (360 scan comparison)
// ---------------------------------------------------------------------------

/** One checklist step as stored today, with the day it was ended (if it was). */
export type ChecklistStepRecord = {
  floorId: string;
  floorName: string;
  buildingName: string;
  track: string;
  stepNumber: number;
  title: string;
  status: "pending" | "in_progress" | "completed";
  /** YYYY-MM-DD the step was ended (work date, else end/complete time); null if not ended. */
  doneDate: string | null;
};

function doneOnOrBefore(step: ChecklistStepRecord, date: string): boolean {
  return step.status === "completed" && step.doneDate != null && step.doneDate <= date.slice(0, 10);
}

/**
 * Rebuild each floor's checklist as it stood on `date`: a step counts if it is
 * ended today and its end date is on or before `date`. Steps that were ended
 * and later reset are not counted (current state is the source of truth).
 */
export function floorsOnDate(
  steps: ChecklistStepRecord[],
  floorIds: string[],
  date: string
): ChecklistFloorInput[] {
  return floorIds.map((floorId) => {
    const byTrack = new Map<string, { completed: number; total: number }>();
    for (const step of steps) {
      if (step.floorId !== floorId) continue;
      const row = byTrack.get(step.track) ?? { completed: 0, total: 0 };
      row.total += 1;
      if (doneOnOrBefore(step, date)) row.completed += 1;
      byTrack.set(step.track, row);
    }
    return {
      floorId,
      tracks: [...byTrack.values()].map((t) => ({
        completed: t.completed,
        total: t.total,
        plannedStart: null,
        plannedEnd: null,
      })),
    };
  });
}

/** Completion % on a date for the given floors (unstarted floors count as 0%). */
export function percentOnDate(
  steps: ChecklistStepRecord[],
  floorIds: string[],
  date: string
): number {
  return projectCompletion(floorsOnDate(steps, floorIds, date), date).actual;
}

/** Steps ended after `from` and on or before `to`, oldest first. */
export function stepsEndedBetween(
  steps: ChecklistStepRecord[],
  floorIds: string[],
  from: string,
  to: string
): ChecklistStepRecord[] {
  const start = from.slice(0, 10);
  const end = to.slice(0, 10);
  const floors = new Set(floorIds);
  return steps
    .filter(
      (s) =>
        floors.has(s.floorId) &&
        s.status === "completed" &&
        s.doneDate != null &&
        s.doneDate > start &&
        s.doneDate <= end
    )
    .sort(
      (a, b) =>
        (a.doneDate ?? "").localeCompare(b.doneDate ?? "") ||
        a.floorName.localeCompare(b.floorName) ||
        a.stepNumber - b.stepNumber
    );
}
