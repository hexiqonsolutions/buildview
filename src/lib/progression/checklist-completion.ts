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
    weightedRollup(
      floor.tracks.map((t) => ({
        percent: t.total > 0 ? (t.completed / t.total) * 100 : null,
        weight: t.total,
      }))
    ) ?? 0;
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
