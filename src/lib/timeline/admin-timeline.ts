import type { IssueWithRelations, Project, ProjectTour, Report, TimelineEventWithRelations } from "@/lib/types";
import {
  parseTourWorkspaceMeta,
  tourMatchesWorkspaceScope,
} from "@/lib/admin/tour-metadata";
import type { WorkspaceScope } from "@/lib/admin/workspace";

export type TimelineTradeProgress = {
  name: string;
  percent: number;
  color: string;
};

export type AdminTimelineMonth = {
  id: string;
  eventId: string | null;
  monthKey: string;
  label: string;
  title: string;
  date: string;
  status: "in_progress" | "completed";
  thumbnailUrl: string | null;
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
    trades: TimelineTradeProgress[];
  };
  whatsNew: string[];
  topIssues: { id: string; title: string; priority: string }[];
};

export const DEFAULT_TRADE_NAMES = ["Structure", "Masonry", "Electrical", "Plumbing"] as const;

export const DEFAULT_TRADE_COLORS: Record<string, string> = {
  Structure: "bg-emerald-500",
  Masonry: "bg-amber-400",
  Electrical: "bg-orange-400",
  Plumbing: "bg-rose-400",
};

function monthKeyFromDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function tourMatchesFilters(
  tour: ProjectTour,
  scope: Pick<WorkspaceScope, "building" | "floor" | "buildingId" | "floorId">
): boolean {
  return tourMatchesWorkspaceScope(tour, scope as WorkspaceScope, new Set([tour.project_id]));
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
  if (Array.isArray(raw)) {
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

/**
 * Build timeline months from saved timeline events only.
 * Does not invent placeholder months or fake progress percentages.
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
  floorId: string | null = null
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
    .filter((e) => e.project_id === project.id && !e.deleted_at)
    .sort((a, b) => {
      const byDate = b.event_date.localeCompare(a.event_date);
      if (byDate !== 0) return byDate;
      return (b.sort_order ?? 0) - (a.sort_order ?? 0);
    });

  if (projectEvents.length === 0) return [];

  const projectTours = tours.filter(
    (t) => t.project_id === project.id && tourMatchesFilters(t, spatialScope)
  );
  const projectReports = reports.filter((r) => r.project_id === project.id);
  const projectIssues = issues.filter((i) => i.project_id === project.id);

  const byMonth = new Map<string, TimelineEventWithRelations[]>();
  for (const event of projectEvents) {
    const key = monthKeyFromDate(event.event_date);
    if (!key) continue;
    const list = byMonth.get(key) ?? [];
    list.push(event);
    byMonth.set(key, list);
  }

  const sortedKeys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key, index) => {
    const label = formatMonthLabel(key);
    const [year, month] = key.split("-").map(Number);
    const date = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEvents = byMonth.get(key) ?? [];
    const primary = monthEvents[0];

    const monthTours = projectTours.filter((t) => {
      const d = t.capture_date ?? t.created_at;
      return monthKeyFromDate(d) === key;
    });
    const monthReports = projectReports.filter((r) => monthKeyFromDate(r.report_date) === key);
    const monthIssues = projectIssues.filter((i) => monthKeyFromDate(i.created_at) === key);
    const photos = monthEvents.flatMap((e) => e.timeline_photos ?? []);

    const engineerFromTour =
      monthTours.map((t) => parseTourWorkspaceMeta(t.description).engineer).find(Boolean) ?? null;

    const thumbnailUrl =
      photos[0]?.image_url ??
      monthTours[0]?.thumbnail_url ??
      null;

    const status: AdminTimelineMonth["status"] =
      primary.status === "completed" ? "completed" : "in_progress";

    const overall =
      typeof primary.progress_percent === "number" ? primary.progress_percent : null;

    const previousKey = sortedKeys[index + 1];
    const previousPrimary = previousKey ? (byMonth.get(previousKey) ?? [])[0] : null;
    const previousOverall =
      previousPrimary && typeof previousPrimary.progress_percent === "number"
        ? previousPrimary.progress_percent
        : null;

    const trades = normalizeTrades(primary.trades);
    const whatsNew = parseWhatsNew(primary.whats_new, primary.progress_note);

    const topIssues = monthIssues
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
      .slice(0, 3)
      .map((i) => ({ id: i.id, title: i.title, priority: i.priority }));

    return {
      id: key,
      eventId: primary.id,
      monthKey: key,
      label,
      title: primary.title || `${label} — Construction Progress`,
      date: primary.event_date || date,
      status,
      thumbnailUrl,
      author: primary.author_name?.trim() || (typeof engineerFromTour === "string" ? engineerFromTour : "BuildView Team"),
      overview: primary.progress_note?.trim() || "",
      counts: {
        tours: monthTours.length,
        reports: monthReports.length,
        photos: photos.length,
        issues: monthIssues.length,
      },
      progress: {
        overall,
        previousOverall,
        trades,
      },
      whatsNew,
      topIssues,
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
