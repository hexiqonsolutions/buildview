import type {
  IssueWithRelations,
  Project,
  ProjectTour,
  Report,
  TimelineEventWithRelations,
  TimelinePhoto,
} from "@/lib/types";
import {
  parseTourWorkspaceMeta,
  tourMatchesWorkspaceScope,
} from "@/lib/admin/tour-metadata";
import { matchesSpatialScope } from "@/lib/admin/scope";
import type { WorkspaceScope } from "@/lib/admin/workspace";

export type TimelineTradeProgress = {
  name: string;
  percent: number;
  color: string;
};

export type TimelineGranularity = "monthly" | "weekly";

/** One saved milestone, as shown inside a period's detail panel. */
export type TimelinePeriodEvent = {
  id: string;
  title: string;
  date: string;
  status: "in_progress" | "completed";
  progressNote: string | null;
  progressPercent: number | null;
  author: string | null;
  location: string | null;
  photos: TimelinePhoto[];
  tour: { id: string; name: string; matterportUrl: string | null } | null;
  report: { id: string; title: string } | null;
};

export type AdminTimelineMonth = {
  /** Period key: `YYYY-MM` (monthly) or the week's Monday `YYYY-MM-DD` (weekly). */
  id: string;
  granularity: TimelineGranularity;
  eventId: string | null;
  /** Calendar month (`YYYY-MM`) the period starts in, used for project deep links. */
  monthKey: string;
  label: string;
  title: string;
  date: string;
  status: "in_progress" | "completed";
  /** Only set for already-public URLs (e.g. Matterport thumbnails); private photos use `thumbnailPhoto`. */
  thumbnailUrl: string | null;
  thumbnailPhoto: TimelinePhoto | null;
  author: string;
  overview: string;
  counts: {
    tours: number;
    reports: number;
    photos: number;
    issues: number;
  };
  progress: {
    overall: number | null;
    previousOverall: number | null;
    previousLabel: string | null;
    trades: TimelineTradeProgress[];
  };
  whatsNew: string[];
  topIssues: { id: string; title: string; priority: string }[];
  /** Every milestone in this period, oldest first. */
  events: TimelinePeriodEvent[];
};

export const DEFAULT_TRADE_NAMES = ["Structure", "Masonry", "Electrical", "Plumbing"] as const;

export const DEFAULT_TRADE_COLORS: Record<string, string> = {
  Structure: "bg-slate-800",
  Masonry: "bg-slate-600",
  Electrical: "bg-slate-500",
  Plumbing: "bg-slate-400",
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Reads the calendar date without timezone conversion. `new Date("2026-03-01")`
 * is UTC midnight, which lands in February for users west of UTC.
 */
function calendarParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate() };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKeyFromParts(p: { y: number; m: number }): string {
  return `${p.y}-${pad(p.m)}`;
}

/** Monday of the ISO week containing the date, as `YYYY-MM-DD`. */
function weekKeyFromParts(p: { y: number; m: number; d: number }): string {
  const date = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function periodKey(value: string | null | undefined, granularity: TimelineGranularity): string {
  const parts = calendarParts(value);
  if (!parts) return "";
  return granularity === "weekly" ? weekKeyFromParts(parts) : monthKeyFromParts(parts);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return `${MONTH_SHORT[month - 1]} ${year}`;
}

function formatPeriodLabel(key: string, granularity: TimelineGranularity): string {
  if (granularity === "monthly") return formatMonthLabel(key);
  const [, month, day] = key.split("-").map(Number);
  return `Wk ${MONTH_SHORT[month - 1]} ${day}`;
}

function formatPeriodLongLabel(key: string, granularity: TimelineGranularity): string {
  if (granularity === "monthly") return formatMonthLabel(key);
  const [year, month, day] = key.split("-").map(Number);
  return `week of ${MONTH_SHORT[month - 1]} ${day}, ${year}`;
}

function tourMatchesFilters(tour: ProjectTour, scope: WorkspaceScope): boolean {
  return tourMatchesWorkspaceScope(tour, scope, new Set([tour.project_id]));
}

/** Project-wide milestones (no building/floor) stay visible under every location filter. */
function eventMatchesFilters(event: TimelineEventWithRelations, scope: WorkspaceScope): boolean {
  const untagged = !event.building && !event.building_id && !event.floor && !event.floor_id;
  if (untagged) return true;
  return matchesSpatialScope(event, scope, new Set([event.project_id]));
}

function priorityWeight(priority: string): number {
  const map: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return map[priority] ?? 0;
}

function normalizeTrades(raw: unknown): TimelineTradeProgress[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const percent = typeof row.percent === "number" ? row.percent : Number(row.percent);
      if (!name || Number.isNaN(percent)) return null;
      return {
        name,
        percent: Math.min(100, Math.max(0, Math.round(percent))),
        color:
          (typeof row.color === "string" && row.color) ||
          DEFAULT_TRADE_COLORS[name] ||
          "bg-slate-400",
      };
    })
    .filter((t): t is TimelineTradeProgress => t != null);
}

function parseWhatsNew(raw: unknown, progressNote: string | null): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .slice(0, 8);
  }
  if (progressNote) {
    return progressNote
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  return [];
}

/** Oldest first: date, then manual sort order, then creation time. */
function compareEventsChronologically(
  a: TimelineEventWithRelations,
  b: TimelineEventWithRelations
): number {
  const byDate = a.event_date.localeCompare(b.event_date);
  if (byDate !== 0) return byDate;
  const bySort = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (bySort !== 0) return bySort;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

function activePhotos(event: TimelineEventWithRelations): TimelinePhoto[] {
  return (event.timeline_photos ?? [])
    .filter((photo) => !photo.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function toPeriodEvent(event: TimelineEventWithRelations): TimelinePeriodEvent {
  const location = [event.building, event.floor].filter(Boolean).join(" · ") || null;
  const tour = event.tour && !event.tour.deleted_at ? event.tour : null;
  const report = event.report && !event.report.deleted_at ? event.report : null;
  return {
    id: event.id,
    title: event.title,
    date: event.event_date,
    status: event.status === "completed" ? "completed" : "in_progress",
    progressNote: event.progress_note?.trim() || null,
    progressPercent: typeof event.progress_percent === "number" ? event.progress_percent : null,
    author: event.author_name?.trim() || null,
    location,
    photos: activePhotos(event),
    tour: tour ? { id: tour.id, name: tour.name, matterportUrl: tour.matterport_url ?? null } : null,
    report: report ? { id: report.id, title: report.title } : null,
  };
}

function isPublicUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

/**
 * Build timeline periods from saved timeline events only.
 * Does not invent placeholder periods or fake progress percentages.
 * Periods are returned newest first; events inside a period oldest first.
 */
export function buildAdminTimelineMonths(
  project: Project,
  events: TimelineEventWithRelations[],
  tours: Array<ProjectTour & { project?: { name: string } | null }>,
  reports: Array<Report & { project?: { name: string } | null }>,
  issues: IssueWithRelations[],
  building: string = "all",
  floor: string = "all",
  buildingId: string | null = null,
  floorId: string | null = null,
  granularity: TimelineGranularity = "monthly"
): AdminTimelineMonth[] {
  const spatialScope: WorkspaceScope = {
    clientId: null,
    projectId: project.id,
    building,
    floor,
    buildingId,
    floorId,
  };

  const projectEvents = events
    .filter(
      (e) => e.project_id === project.id && !e.deleted_at && eventMatchesFilters(e, spatialScope)
    )
    .sort(compareEventsChronologically);

  if (projectEvents.length === 0) return [];

  const projectTours = tours.filter(
    (t) => t.project_id === project.id && !t.deleted_at && tourMatchesFilters(t, spatialScope)
  );
  const projectReports = reports.filter((r) => r.project_id === project.id && !r.deleted_at);
  const projectIssues = issues.filter(
    (i) => i.project_id === project.id && !i.deleted_at && matchesSpatialScope(i, spatialScope, new Set([project.id]))
  );

  const byPeriod = new Map<string, TimelineEventWithRelations[]>();
  for (const event of projectEvents) {
    const key = periodKey(event.event_date, granularity);
    if (!key) continue;
    const list = byPeriod.get(key) ?? [];
    list.push(event);
    byPeriod.set(key, list);
  }

  const sortedKeys = Array.from(byPeriod.keys()).sort((a, b) => b.localeCompare(a));

  const latestProgressByKey = new Map<string, number | null>();
  for (const key of sortedKeys) {
    const withProgress = (byPeriod.get(key) ?? []).filter(
      (e) => typeof e.progress_percent === "number"
    );
    const latest = withProgress[withProgress.length - 1];
    latestProgressByKey.set(key, latest ? (latest.progress_percent as number) : null);
  }

  return sortedKeys.map((key, index) => {
    const periodEvents = byPeriod.get(key) ?? [];
    const primary = periodEvents[periodEvents.length - 1];
    const label = formatPeriodLabel(key, granularity);
    const parts = calendarParts(key)!;
    const monthKey = monthKeyFromParts(parts);

    const periodTours = projectTours.filter(
      (t) => periodKey(t.capture_date ?? t.created_at, granularity) === key
    );
    const periodReports = projectReports.filter(
      (r) => periodKey(r.report_date, granularity) === key
    );
    const periodIssues = projectIssues.filter(
      (i) => periodKey(i.created_at, granularity) === key
    );
    const photos = periodEvents.flatMap(activePhotos);

    const engineerFromTour =
      periodTours.map((t) => parseTourWorkspaceMeta(t.description).engineer).find(Boolean) ?? null;

    const linkedTourThumb = [...periodEvents]
      .reverse()
      .map((e) => e.tour?.thumbnail_url)
      .find(isPublicUrl);
    const publicPhoto = photos.find((p) => isPublicUrl(p.image_url));
    const thumbnailUrl =
      publicPhoto?.image_url ??
      linkedTourThumb ??
      periodTours.map((t) => t.thumbnail_url).find(isPublicUrl) ??
      null;

    const overall = latestProgressByKey.get(key) ?? null;
    let previousOverall: number | null = null;
    let previousLabel: string | null = null;
    for (const olderKey of sortedKeys.slice(index + 1)) {
      const value = latestProgressByKey.get(olderKey);
      if (typeof value === "number") {
        previousOverall = value;
        previousLabel = formatPeriodLongLabel(olderKey, granularity);
        break;
      }
    }

    const tradesSource = [...periodEvents]
      .reverse()
      .find((e) => normalizeTrades(e.trades).length > 0);
    const trades = tradesSource ? normalizeTrades(tradesSource.trades) : [];
    const whatsNew = parseWhatsNew(primary.whats_new, primary.progress_note);

    const topIssues = [...periodIssues]
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
      .slice(0, 3)
      .map((i) => ({ id: i.id, title: i.title, priority: i.priority }));

    return {
      id: key,
      granularity,
      eventId: primary.id,
      monthKey,
      label,
      title: primary.title || `${label} — Construction Progress`,
      date: primary.event_date,
      status: primary.status === "completed" ? "completed" : "in_progress",
      thumbnailUrl,
      thumbnailPhoto: thumbnailUrl ? null : photos[0] ?? null,
      author:
        primary.author_name?.trim() ||
        (typeof engineerFromTour === "string" ? engineerFromTour : "BuildView Team"),
      overview: primary.progress_note?.trim() || "",
      counts: {
        tours: periodTours.length,
        reports: periodReports.length,
        photos: photos.length,
        issues: periodIssues.length,
      },
      progress: {
        overall,
        previousOverall,
        previousLabel,
        trades,
      },
      whatsNew,
      topIssues,
      events: periodEvents.map(toPeriodEvent),
    };
  });
}

export function getBuildingOptions(
  tours: Array<ProjectTour & { project?: { name: string } | null }>,
  projectId: string
): string[] {
  const set = new Set<string>();
  tours
    .filter((t) => t.project_id === projectId)
    .forEach((t) => {
      const b = parseTourWorkspaceMeta(t.description).building;
      if (b) set.add(b);
    });
  return Array.from(set).sort();
}

export function getFloorOptions(
  tours: Array<ProjectTour & { project?: { name: string } | null }>,
  projectId: string,
  building: string
): string[] {
  const set = new Set<string>();
  tours
    .filter((t) => t.project_id === projectId)
    .forEach((t) => {
      const meta = parseTourWorkspaceMeta(t.description);
      if (building !== "all" && meta.building !== building) return;
      if (meta.floor) set.add(meta.floor);
    });
  return Array.from(set).sort();
}
