import type {
  Document,
  IssueWithRelations,
  Report,
  TimelineEventWithRelations,
} from "@/lib/types";
import { isOpenIssueStatus } from "@/lib/issues/status";
import type {
  ComparisonActivity,
  ComparisonKpis,
  ComparisonSnapshot,
  EnrichedTour,
  ScanProgress,
  TradeProgressItem,
  VisualChangeCard,
} from "@/lib/comparison/types";
import {
  filterByCreatedAt,
  filterIssuesInWindow,
  filterReportsInWindow,
  filterTimelineInWindow,
  getComparisonWindow,
  isInWindow,
  isOnOrAfterScanA,
  type ComparisonDateWindow,
} from "@/lib/comparison/date-window";
import { getTourDate } from "@/lib/comparison/metadata";
import { EMPTY_SCAN_PROGRESS } from "@/lib/comparison/progress";

export function filterBetweenScans<T extends { created_at: string }>(
  items: T[],
  scanA: EnrichedTour,
  scanB: EnrichedTour
): T[] {
  const window = getComparisonWindow(scanA, scanB);
  return filterByCreatedAt(items, window);
}

export function filterReportsBetween(reports: Report[], scanA: EnrichedTour, scanB: EnrichedTour) {
  const window = getComparisonWindow(scanA, scanB);
  return filterReportsInWindow(reports, window);
}

export function filterTimelineBetween(
  events: TimelineEventWithRelations[],
  scanA: EnrichedTour,
  scanB: EnrichedTour
) {
  const window = getComparisonWindow(scanA, scanB);
  return filterTimelineInWindow(events, window);
}

export function filterIssuesBetween(
  issues: IssueWithRelations[],
  scanA: EnrichedTour,
  scanB: EnrichedTour
) {
  const window = getComparisonWindow(scanA, scanB);
  return filterIssuesInWindow(issues, window);
}

export function bucketIssues(
  issues: IssueWithRelations[],
  window: ComparisonDateWindow
) {
  const resolvedIssues = issues.filter(
    (issue) =>
      (issue.status === "resolved" || issue.status === "closed") &&
      isInWindow(issue.resolved_at ?? issue.updated_at, window)
  );

  const newIssues = issues.filter(
    (issue) =>
      isOnOrAfterScanA(issue.created_at, window) &&
      isOpenIssueStatus(issue.status)
  );

  const pendingIssues = issues.filter(
    (issue) => isOpenIssueStatus(issue.status)
  );

  const criticalIssues = issues.filter(
    (issue) => issue.priority === "critical" && issue.status !== "closed"
  );

  return { resolvedIssues, newIssues, pendingIssues, criticalIssues };
}

export function buildKpis(
  scanA: ScanProgress,
  scanB: ScanProgress,
  issues: IssueWithRelations[]
): ComparisonKpis {
  const previousProgress = scanA.overall;
  const currentProgress = scanB.overall;
  const difference =
    previousProgress != null && currentProgress != null ? currentProgress - previousProgress : null;
  const criticalCount = issues.filter((i) => i.priority === "critical" && i.status !== "closed").length;
  const openCount = issues.filter((i) => isOpenIssueStatus(i.status)).length;

  return {
    previousProgress,
    currentProgress,
    difference,
    scheduleStatus:
      difference == null
        ? "unknown"
        : difference >= 8
          ? "on_track"
          : difference >= 3
            ? "at_risk"
            : "delayed",
    qualityStatus: criticalCount > 0 ? "concern" : openCount > 3 ? "review" : "good",
    safetyStatus: issues.some((i) => i.title.toLowerCase().includes("safety") && i.status !== "closed")
      ? "alert"
      : openCount > 5
        ? "watch"
        : "clear",
    healthScore:
      currentProgress == null
        ? null
        : Math.min(
            100,
            Math.max(
              40,
              currentProgress - criticalCount * 8 - openCount * 2 + (difference ?? 0) * 0.5
            )
          ),
  };
}

export function buildVisualChanges(
  documents: Document[],
  issues: IssueWithRelations[],
  reports: Report[]
): VisualChangeCard[] {
  const completed = reports.filter((r) => r.report_type === "progress_report").length;
  const critical = issues.filter((i) => i.priority === "critical").length;
  const pending = issues.filter((i) => isOpenIssueStatus(i.status)).length;
  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;

  return [
    { id: "completed", label: "Completed Work", count: completed + resolved, tone: "success" },
    { id: "new", label: "New Areas", count: documents.length, tone: "info" },
    { id: "pending", label: "Pending Areas", count: pending, tone: "warning" },
    { id: "delayed", label: "Delayed Work", count: Math.max(0, pending - resolved), tone: "danger" },
    { id: "critical", label: "Critical Observations", count: critical, tone: "danger" },
  ];
}

export function buildActivityLog(
  scanA: EnrichedTour,
  scanB: EnrichedTour,
  documents: Document[],
  reports: Report[],
  issues: IssueWithRelations[],
  timeline: TimelineEventWithRelations[]
): ComparisonActivity[] {
  const activities: ComparisonActivity[] = [];

  activities.push({
    id: `tour-a-${scanA.id}`,
    type: "matterport",
    label: `Baseline scan — ${scanA.name}`,
    timestamp: scanA.capture_date ?? scanA.created_at,
  });

  activities.push({
    id: `tour-b-${scanB.id}`,
    type: "matterport",
    label: `Comparison scan — ${scanB.name}`,
    timestamp: scanB.capture_date ?? scanB.created_at,
  });

  reports.forEach((r) => {
    activities.push({
      id: `report-${r.id}`,
      type: "report",
      label: `${r.title} uploaded`,
      timestamp: r.report_date,
    });
  });

  issues.forEach((i) => {
    if (i.status === "resolved" || i.status === "closed") {
      activities.push({
        id: `issue-closed-${i.id}`,
        type: "issue",
        label: `Issue closed — ${i.title}`,
        timestamp: i.resolved_at ?? i.updated_at,
      });
    } else {
      activities.push({
        id: `issue-new-${i.id}`,
        type: "issue",
        label: `Issue created — ${i.title}`,
        timestamp: i.created_at,
      });
    }
  });

  documents.forEach((d) => {
    activities.push({
      id: `doc-${d.id}`,
      type: "document",
      label: `New drawing uploaded — ${d.name}`,
      timestamp: d.created_at,
    });
  });

  timeline.forEach((e) => {
    if (e.progress_note) {
      activities.push({
        id: `note-${e.id}`,
        type: "note",
        label: `Engineer notes added — ${e.title}`,
        timestamp: e.event_date,
      });
    }
  });

  return activities.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function buildTimelineNodes(snapshot: ComparisonSnapshot) {
  const nodes: Array<{ id: string; label: string; date: string; type: string }> = [
    {
      id: `scan-a-${snapshot.scanA.id}`,
      label: "Scan A",
      date: snapshot.scanA.capture_date ?? snapshot.scanA.created_at,
      type: "scan",
    },
  ];

  snapshot.timelineEvents.forEach((event) => {
    nodes.push({
      id: event.id,
      label: event.title,
      date: event.event_date,
      type: event.tour_id ? "matterport" : event.report_id ? "report" : "event",
    });
  });

  nodes.push({
    id: `scan-b-${snapshot.scanB.id}`,
    label: "Scan B",
    date: snapshot.scanB.capture_date ?? snapshot.scanB.created_at,
    type: "scan",
  });

  return nodes.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function orderScans(scanA: EnrichedTour, scanB: EnrichedTour): [EnrichedTour, EnrichedTour] {
  const a = getTourDate(scanA);
  const b = getTourDate(scanB);
  return a <= b ? [scanA, scanB] : [scanB, scanA];
}

export function buildAiPlaceholder(
  kpis: ComparisonKpis,
  tradeProgress: TradeProgressItem[],
  criticalIssues: IssueWithRelations[]
): ComparisonSnapshot["aiPlaceholder"] {
  const pending = tradeProgress
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .map((t) => t.trade);
  const completed = tradeProgress
    .filter((t) => t.status === "completed" && (t.before ?? 0) < 100)
    .map((t) => t.trade);

  let overallProgress: string;
  if (kpis.difference != null && kpis.currentProgress != null) {
    overallProgress = `Overall progress changed by ${kpis.difference >= 0 ? "+" : ""}${kpis.difference}% between site visits. Current completion at ${kpis.currentProgress}%.`;
  } else if (kpis.currentProgress != null) {
    overallProgress = `Current completion at ${kpis.currentProgress}%. No progress was recorded in Timeline for the earlier scan.`;
  } else {
    overallProgress = "Overall progress hasn't been recorded in Timeline for these scans yet.";
  }

  return {
    overallProgress,
    keyChanges: [
      ...completed.slice(0, 2).map((t) => `${t} marked complete`),
      ...(kpis.difference != null ? [`${kpis.difference}% net progress change`] : []),
    ],
    pendingActivities: pending.slice(0, 4),
    criticalRisks: criticalIssues.slice(0, 3).map((i) => i.title),
    recommendedActions: [
      "Review pending trades with site engineer",
      "Close critical issues before next scan",
      "Upload progress report for current milestone",
    ],
  };
}

/** Empty-but-visible dashboard shell so timeline/KPIs stay on screen before data loads. */
export function buildShellComparisonSnapshot(
  project: ComparisonSnapshot["project"],
  scanA: EnrichedTour,
  scanB: EnrichedTour
): ComparisonSnapshot {
  const [orderedA, orderedB] = orderScans(scanA, scanB);
  const kpis = buildKpis(EMPTY_SCAN_PROGRESS, EMPTY_SCAN_PROGRESS, []);
  const tradeProgress: TradeProgressItem[] = [];
  const visualChanges = buildVisualChanges([], [], []);
  const activities = buildActivityLog(orderedA, orderedB, [], [], [], []);

  return {
    project,
    scanA: orderedA,
    scanB: orderedB,
    dateWindowLabel: `${new Date(orderedA.capture_date ?? orderedA.created_at).toLocaleDateString()} → ${new Date(orderedB.capture_date ?? orderedB.created_at).toLocaleDateString()}`,
    kpis,
    tradeProgress,
    progressSources: null,
    visualChanges,
    documentsBetween: [],
    reportsBetween: [],
    newReports: [],
    resolvedIssues: [],
    newIssues: [],
    pendingIssues: [],
    criticalIssues: [],
    timelineEvents: [],
    photosA: [],
    photosB: [],
    activities,
    engineerNotesA: orderedA.metadata.notes,
    engineerNotesB: orderedB.metadata.notes,
    aiPlaceholder: buildAiPlaceholder(kpis, tradeProgress, []),
  };
}

const BLANK_SCAN_A_ID = "blank-scan-a";
const BLANK_SCAN_B_ID = "blank-scan-b";

function blankEnrichedTour(
  id: string,
  name: string,
  project: ComparisonSnapshot["project"] | null,
  captureDate: string
): EnrichedTour {
  return {
    id,
    project_id: project?.id ?? "blank-project",
    name,
    matterport_url: "",
    capture_date: captureDate,
    description: null,
    thumbnail_url: null,
    sort_order: 0,
    created_at: captureDate,
    updated_at: captureDate,
    created_by: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    building_id: null,
    floor_id: null,
    metadata: {
      building: "",
      floor: "",
      engineer: "—",
      version: "",
      weather: "",
      projectStage: "",
      notes: "",
    },
    project: project
      ? { id: project.id, name: project.name, client_name: project.client_name }
      : null,
  };
}

/** Full blank UI (same layout as live compare) with empty values until tours exist. */
export function buildBlankComparisonSnapshot(
  project: ComparisonSnapshot["project"] | null
): ComparisonSnapshot {
  const fallbackProject: ComparisonSnapshot["project"] = project ?? {
    id: "blank-project",
    name: "—",
    client_id: "blank-client",
    client_name: "—",
    location: "",
    description: null,
    status: "planning",
    start_date: null,
    completion_date: null,
    cover_image_url: null,
    created_at: "",
    updated_at: "",
    created_by: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
  };

  const scanA = blankEnrichedTour(BLANK_SCAN_A_ID, "Scan A", fallbackProject, "1970-01-01");
  const scanB = blankEnrichedTour(BLANK_SCAN_B_ID, "Scan B", fallbackProject, "1970-01-02");

  return {
    project: fallbackProject,
    scanA,
    scanB,
    dateWindowLabel: "— → —",
    kpis: {
      previousProgress: null,
      currentProgress: null,
      difference: null,
      scheduleStatus: "unknown",
      qualityStatus: "good",
      safetyStatus: "clear",
      healthScore: null,
    },
    tradeProgress: [],
    progressSources: null,
    visualChanges: [
      { id: "completed", label: "Completed Work", count: 0, tone: "success" },
      { id: "new", label: "New Areas", count: 0, tone: "info" },
      { id: "pending", label: "Pending Areas", count: 0, tone: "warning" },
      { id: "delayed", label: "Delayed Work", count: 0, tone: "danger" },
      { id: "critical", label: "Critical Observations", count: 0, tone: "danger" },
    ],
    documentsBetween: [],
    reportsBetween: [],
    newReports: [],
    resolvedIssues: [],
    newIssues: [],
    pendingIssues: [],
    criticalIssues: [],
    timelineEvents: [],
    photosA: [],
    photosB: [],
    activities: [],
    engineerNotesA: "",
    engineerNotesB: "",
    aiPlaceholder: {
      overallProgress: "Upload site visits to generate an AI summary of progress between captures.",
      keyChanges: [],
      pendingActivities: [],
      criticalRisks: [],
      recommendedActions: [
        "Upload virtual tour scans for this project",
        "Add progress reports and site notes",
        "Compare two captures once available",
      ],
    },
  };
}

export function isBlankComparisonSnapshot(snapshot: ComparisonSnapshot): boolean {
  return snapshot.scanA.id === BLANK_SCAN_A_ID || snapshot.scanB.id === BLANK_SCAN_B_ID;
}
