import type {
  ProgressionDailyPoint,
  ProgressionPhaseView,
  ProgressionStepView,
  ProgressionWeeklyPoint,
} from "@/lib/progression/types";

function calendarDay(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

/** Monday of the ISO week containing the date (`YYYY-MM-DD`). */
function weekStart(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function weekLabel(weekStartDay: string): string {
  const [, m, d] = weekStartDay.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Wk ${months[m - 1]} ${d}`;
}

export function buildPhases(steps: ProgressionStepView[]): ProgressionPhaseView[] {
  const byPhase = new Map<number, ProgressionPhaseView>();

  for (const step of steps) {
    let phase = byPhase.get(step.phaseNumber);
    if (!phase) {
      phase = {
        number: step.phaseNumber,
        name: step.phaseName,
        stage: step.phaseStage,
        total: 0,
        completed: 0,
        inProgress: 0,
        percent: 0,
        startedAt: null,
        endedAt: null,
        steps: [],
      };
      byPhase.set(step.phaseNumber, phase);
    }
    phase.steps.push(step);
    phase.total += 1;
    if (step.status === "completed") phase.completed += 1;
    if (step.status === "in_progress") phase.inProgress += 1;
    const startedAt = step.startedAt ?? step.completedAt;
    if (startedAt && (!phase.startedAt || startedAt < phase.startedAt)) {
      phase.startedAt = startedAt;
    }
    const endedAt = step.endedAt ?? step.completedAt;
    if (endedAt && (!phase.endedAt || endedAt > phase.endedAt)) {
      phase.endedAt = endedAt;
    }
  }

  return [...byPhase.values()]
    .sort((a, b) => a.number - b.number)
    .map((phase) => ({
      ...phase,
      percent: phase.total === 0 ? 0 : Math.round((phase.completed / phase.total) * 100),
      steps: [...phase.steps].sort((a, b) => a.stepNumber - b.stepNumber),
    }));
}

/** Today as YYYY-MM-DD in Asia/Kolkata (site work is logged in India time). */
function todayKolkataDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function buildDailySeries(
  logs: Array<{ action: string; work_date: string }>,
  days = 14
): ProgressionDailyPoint[] {
  const [y, m, d] = todayKolkataDay().split("-").map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  const counts = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(todayUtc - i * 86_400_000).toISOString().slice(0, 10);
    counts.set(day, 0);
  }

  for (const log of logs) {
    if (log.action !== "completed" && log.action !== "ended") continue;
    const day = calendarDay(log.work_date);
    if (!day || !counts.has(day)) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return [...counts.entries()].map(([date, completions]) => ({ date, completions }));
}

export function buildWeeklySeries(
  logs: Array<{ action: string; work_date: string }>,
  weeks = 8
): ProgressionWeeklyPoint[] {
  const thisWeek = weekStart(todayKolkataDay());

  const weekDays: string[] = [];
  {
    const [y, m, d] = thisWeek.split("-").map(Number);
    const anchor = new Date(Date.UTC(y, m - 1, d));
    for (let i = weeks - 1; i >= 0; i--) {
      const w = new Date(anchor);
      w.setUTCDate(anchor.getUTCDate() - i * 7);
      weekDays.push(w.toISOString().slice(0, 10));
    }
  }

  const counts = new Map(weekDays.map((w) => [w, 0]));

  for (const log of logs) {
    if (log.action !== "completed" && log.action !== "ended") continue;
    const day = calendarDay(log.work_date);
    if (!day) continue;
    const w = weekStart(day);
    if (!counts.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return weekDays.map((weekStartDay) => ({
    weekStart: weekStartDay,
    label: weekLabel(weekStartDay),
    completions: counts.get(weekStartDay) ?? 0,
  }));
}

export function overallPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
