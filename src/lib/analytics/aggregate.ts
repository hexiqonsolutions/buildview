/**
 * Aggregation for traffic analytics (pure, tested). Days are India dates.
 */

const IST_OFFSET_MS = 330 * 60_000;

export function istDay(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Every India date from `from` to `to` inclusive (YYYY-MM-DD). */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const end = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  for (let t = start; t <= end && out.length < 400; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Start of an India date as a UTC ISO timestamp. */
export function istDayStartIso(day: string): string {
  return new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) - IST_OFFSET_MS).toISOString();
}

export type ShareVisitRow = {
  share_id: string;
  visitor_id: string;
  is_preview: boolean;
  preview_source: string | null;
  visit_started_at: string;
  active_seconds: number;
  unlocked_at: string | null;
  device: string | null;
  country: string | null;
  referrer_host: string | null;
};

export type LinkStats = {
  opens: number;
  unique: number;
  unlocked: number;
  unlockRate: number | null;
  avgSeconds: number | null;
  returning: number;
  previews: number;
  lastOpened: string | null;
};

export function linkStats(rows: ShareVisitRow[]): LinkStats {
  const people = rows.filter((r) => !r.is_preview);
  const unique = new Set(people.map((r) => r.visitor_id));
  const unlockedVisitors = new Set(people.filter((r) => r.unlocked_at).map((r) => r.visitor_id));
  const timed = people.filter((r) => r.unlocked_at && r.active_seconds > 0);
  const daysByVisitor = new Map<string, Set<string>>();
  for (const r of people) {
    const s = daysByVisitor.get(r.visitor_id) ?? new Set<string>();
    s.add(istDay(r.visit_started_at));
    daysByVisitor.set(r.visitor_id, s);
  }
  const last = people.map((r) => r.visit_started_at).sort().at(-1) ?? null;
  return {
    opens: people.length,
    unique: unique.size,
    unlocked: unlockedVisitors.size,
    unlockRate: unique.size > 0 ? (unlockedVisitors.size / unique.size) * 100 : null,
    avgSeconds: timed.length > 0 ? timed.reduce((s, r) => s + r.active_seconds, 0) / timed.length : null,
    returning: [...daysByVisitor.values()].filter((d) => d.size > 1).length,
    previews: rows.length - people.length,
    lastOpened: last,
  };
}

/** Opens and unlocks per India date. */
export function dailyOpens(rows: ShareVisitRow[], days: string[]): { date: string; opens: number; unlocked: number }[] {
  const map = new Map(days.map((d) => [d, { date: d, opens: 0, unlocked: 0 }]));
  for (const r of rows) {
    if (r.is_preview) continue;
    const d = map.get(istDay(r.visit_started_at));
    if (!d) continue;
    d.opens += 1;
    if (r.unlocked_at) d.unlocked += 1;
  }
  return [...map.values()];
}

/** Count by a key, largest first, top N (null/empty → "Unknown"). */
export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined, top = 8): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r)?.trim() || "Unknown";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, top);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

/** CSV text (formula-injection safe). */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
