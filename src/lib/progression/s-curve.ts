import {
  projectCompletion,
  type ChecklistFloorInput,
  type ChecklistStepRecord,
} from "@/lib/progression/checklist-completion";

/**
 * S-curve (Milestone 5): planned vs actual completion over time, rebuilt from
 * history instead of waiting for snapshots to accumulate.
 *
 *   actual(d)  = project % on day d (checklist steps ended on/before d; zone floors
 *                from their observations on/before d), unstarted floors = 0%
 *   planned(d) = planned % across scheduled floors on day d
 *
 * Pure; the server supplies steps, schedules and a zone callback.
 */

export type SCurveTrack = {
  track: string;
  total: number;
  plannedStart: string | null;
  plannedEnd: string | null;
};

export type SCurveFloor = { floorId: string; tracks: SCurveTrack[] };

export type SCurvePoint = {
  date: string;
  /** Null for dates after today (the future has no actuals yet). */
  actual: number | null;
  planned: number | null;
};

const DAY = 86_400_000;
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const toMs = (day: string) => {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function buildSCurve(input: {
  floors: SCurveFloor[];
  steps: ChecklistStepRecord[];
  today: string;
  /** Earliest zone observation, so the curve starts early enough. */
  earliestZoneDate?: string | null;
  /** Zone floor % on a date (floor id → %); omit when there are no zones. */
  zonePercentsOnDate?: (date: string) => Map<string, number>;
  maxPoints?: number;
}): SCurvePoint[] {
  const today = input.today.slice(0, 10);
  const starts: string[] = [];
  const ends: string[] = [today];
  for (const step of input.steps) if (step.doneDate) starts.push(step.doneDate);
  for (const floor of input.floors) {
    for (const t of floor.tracks) {
      if (t.plannedStart) starts.push(t.plannedStart.slice(0, 10));
      if (t.plannedEnd) ends.push(t.plannedEnd.slice(0, 10));
    }
  }
  if (input.earliestZoneDate) starts.push(input.earliestZoneDate.slice(0, 10));
  if (starts.length === 0) return [];

  const startMs = toMs(starts.sort()[0]);
  const endMs = toMs(ends.sort().at(-1)!);
  const maxPoints = input.maxPoints ?? 40;
  const spanDays = Math.max(1, Math.round((endMs - startMs) / DAY));
  const stepDays = Math.max(7, Math.ceil(spanDays / (maxPoints - 1)));

  const dates: string[] = [];
  for (let ms = startMs; ms < endMs; ms += stepDays * DAY) dates.push(toDay(ms));
  dates.push(toDay(endMs));
  if (!dates.includes(today)) dates.push(today);
  dates.sort();

  // Steps grouped by floor + track, for per-date counting.
  const doneByFloorTrack = new Map<string, string[]>();
  for (const step of input.steps) {
    if (step.status !== "completed" || !step.doneDate) continue;
    const key = `${step.floorId}:${step.track}`;
    const list = doneByFloorTrack.get(key) ?? [];
    list.push(step.doneDate);
    doneByFloorTrack.set(key, list);
  }

  return dates.map((date) => {
    const zones = date <= today ? input.zonePercentsOnDate?.(date) : undefined;
    const floors: ChecklistFloorInput[] = input.floors.map((floor) => ({
      floorId: floor.floorId,
      zoneActual: zones?.get(floor.floorId) ?? null,
      tracks: floor.tracks.map((t) => ({
        completed: (doneByFloorTrack.get(`${floor.floorId}:${t.track}`) ?? []).filter((d) => d <= date).length,
        total: t.total,
        plannedStart: t.plannedStart,
        plannedEnd: t.plannedEnd,
      })),
    }));
    const result = projectCompletion(floors, date);
    return {
      date,
      actual: date <= today ? result.actual : null,
      planned: result.planned,
    };
  });
}
