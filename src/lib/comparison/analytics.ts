import type {
  Document,
  IssueWithRelations,
  Report,
  TimelineEventWithRelations,
} from "@/lib/types";
import type {
  ComparisonActivity,
  ComparisonKpis,
  ComparisonSnapshot,
  EnrichedTour,
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

const DEFAULT_TRADES = [
  "Structure",
  "Masonry",
  "Plastering",
  "Electrical",
  "Plumbing",
  "Painting",
  "Flooring",
];

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
      (issue.status === "open" || issue.status === "in_progress")
  );

  const pendingIssues = issues.filter(
    (issue) => issue.status === "open" || issue.status === "in_progress"
  );

  const criticalIssues = issues.filter(
    (issue) => issue.priority === "critical" && issue.status !== "closed"
  );

  return { resolvedIssues, newIssues, pendingIssues, criticalIssues };
}

export function buildTradeProgress(
  scanA: EnrichedTour,
  scanB: EnrichedTour,
  reports: Report[],
  issues: IssueWithRelations[]
): TradeProgressItem[] {
  const delta = scanB.metadata.progressPercent - scanA.metadata.progressPercent;
  const resolved = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const open = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;

  return DEFAULT_TRADES.map((trade, i) => {
    const ratio = (i + 1) / DEFAULT_TRADES.length;
    const tradeDelta = Math.round((delta * ratio) / DEFAULT_TRADES.length) || 0;
    const threshold = scanA.metadata.progressPercent + delta * ratio;

    if (threshold >= scanB.metadata.progressPercent - 5) {
      return { trade, status: "completed" as const, delta: tradeDelta > 0 ? tradeDelta : undefined };
    }
    if (threshold >= scanB.metadata.progressPercent - 20) {
      const pct = Math.round(((threshold - scanA.metadata.progressPercent) / Math.max(delta, 1)) * 100);
      return {
        trade,
        status: "in_progress" as const,
        detail: `${Math.min(95, Math.max(10, pct))}%`,
        delta: tradeDelta > 0 ? tradeDelta : undefined,
      };
    }
    if (reports.length > 0 && i < reports.length) {
      return { trade, status: "started" as const, delta: tradeDelta > 0 ? tradeDelta : undefined };
    }
    if (open > resolved && i === DEFAULT_TRADES.length - 1) {
      return { trade, status: "pending" as const };
    }
    return { trade, status: "pending" as const, delta: 0 };
  });
}

export function buildKpis(scanA: EnrichedTour, scanB: EnrichedTour, issues: IssueWithRelations[]): ComparisonKpis {
  const previousProgress = scanA.metadata.progressPercent;
  const currentProgress = scanB.metadata.progressPercent;
  const difference = currentProgress - previousProgress;
  const criticalCount = issues.filter((i) => i.priority === "critical" && i.status !== "closed").length;
  const openCount = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;

  return {
    previousProgress,
    currentProgress,
    difference,
    scheduleStatus: difference >= 8 ? "on_track" : difference >= 3 ? "at_risk" : "delayed",
    qualityStatus: criticalCount > 0 ? "concern" : openCount > 3 ? "review" : "good",
    safetyStatus: issues.some((i) => i.title.toLowerCase().includes("safety") && i.status !== "closed")
      ? "alert"
      : openCount > 5
        ? "watch"
        : "clear",
    healthScore: Math.min(
      100,
      Math.max(
        40,
        currentProgress - criticalCount * 8 - openCount * 2 + difference * 0.5
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
  const pending = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;
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
  const pending = tradeProgress.filter((t) => t.status === "pending").map((t) => t.trade);
  const completed = tradeProgress.filter((t) => t.status === "completed").map((t) => t.trade);

  return {
    overallProgress: `Overall progress increased by ${kpis.difference}% between site visits. Current completion at ${kpis.currentProgress}%.`,
    keyChanges: [
      ...completed.slice(0, 2).map((t) => `${t} marked complete`),
      `${kpis.difference}% net progress gain`,
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
