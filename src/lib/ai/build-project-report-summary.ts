import type { IssueWithRelations, Report, TimelineEventWithRelations } from "@/lib/types";
import { REPORT_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import type { ProjectAiSummary } from "@/lib/ai/project-summary-types";

const DAY_MS = 86_400_000;

function excerpt(text: string | null | undefined, max = 140): string {
  const trimmed = text?.trim();
  if (!trimmed) return "No description provided.";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function reportSortKey(report: Report): number {
  return new Date(report.report_date || report.created_at).getTime();
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export function buildProjectReportSummary(input: {
  projectName: string;
  reports: Report[];
  issues?: IssueWithRelations[];
  timeline?: TimelineEventWithRelations[];
}): ProjectAiSummary {
  const { projectName, reports, issues = [], timeline = [] } = input;
  const sortedReports = [...reports].sort((a, b) => reportSortKey(b) - reportSortKey(a));
  const openIssues = issues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  );
  const criticalIssues = openIssues.filter(
    (i) => i.priority === "critical" || i.priority === "high"
  );

  if (sortedReports.length === 0) {
    return {
      overallProgress: `${projectName} has no progress or inspection reports uploaded yet. Upload reports to unlock an AI digest of site documentation.`,
      reportDigest: [],
      keyChanges: [],
      pendingActivities: openIssues.slice(0, 5).map((i) => i.title),
      criticalRisks: criticalIssues.slice(0, 5).map((i) => i.title),
      recommendedActions: [
        "Upload the first progress report for this project",
        "Link reports to timeline milestones when available",
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const reportDigest = sortedReports.map((report) => {
    const location = [report.building, report.floor].filter(Boolean).join(" · ");
    return {
      id: report.id,
      title: report.title,
      typeLabel: REPORT_TYPE_LABELS[report.report_type] ?? report.report_type,
      date: formatDate(report.report_date || report.created_at),
      excerpt: location
        ? `${excerpt(report.description)} · ${location}`
        : excerpt(report.description),
    };
  });

  const oldest = sortedReports[sortedReports.length - 1];
  const newest = sortedReports[0];
  const typeCounts = new Map<string, number>();
  sortedReports.forEach((r) => {
    const label = REPORT_TYPE_LABELS[r.report_type] ?? r.report_type;
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  });

  const typeBreakdown = Array.from(typeCounts.entries())
    .map(([label, count]) => `${count} ${label}${count === 1 ? "" : "s"}`)
    .join(", ");

  const latestReportAge = daysSince(newest.report_date || newest.created_at);
  const overallProgress = [
    `${projectName} has ${sortedReports.length} report${sortedReports.length === 1 ? "" : "s"} on file`,
    `( ${typeBreakdown} ).`,
    `Coverage runs from ${formatDate(oldest.report_date || oldest.created_at)} to ${formatDate(newest.report_date || newest.created_at)}.`,
    latestReportAge != null && latestReportAge <= 14
      ? "Documentation is current — latest upload within the last two weeks."
      : latestReportAge != null
        ? `Latest report is ${latestReportAge} days old — consider a fresh progress upload.`
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  const keyChanges: string[] = [];
  sortedReports.slice(0, 6).forEach((report) => {
    const label = REPORT_TYPE_LABELS[report.report_type] ?? report.report_type;
    keyChanges.push(
      `${formatDate(report.report_date || report.created_at)} — ${label}: ${report.title}`
    );
  });
  if (sortedReports.length > 6) {
    keyChanges.push(`+ ${sortedReports.length - 6} earlier report${sortedReports.length - 6 === 1 ? "" : "s"} in full digest below`);
  }

  const pendingActivities: string[] = [];
  openIssues.slice(0, 4).forEach((issue) => {
    pendingActivities.push(`Open issue: ${issue.title} (${issue.priority})`);
  });
  const recentTimeline = timeline
    .filter((e) => daysSince(e.event_date) != null && daysSince(e.event_date)! <= 45)
    .slice(0, 3);
  recentTimeline.forEach((event) => {
    pendingActivities.push(`Timeline: ${event.title} (${formatDate(event.event_date)})`);
  });
  if (pendingActivities.length === 0) {
    pendingActivities.push("No open issues or recent timeline flags in the last 45 days.");
  }

  const criticalRisks = criticalIssues.length
    ? criticalIssues.slice(0, 5).map((i) => `${i.title} (${i.priority})`)
    : ["No critical or high-priority open issues flagged."];

  const recommendedActions: string[] = [];
  if (!typeCounts.has("Safety Report")) {
    recommendedActions.push("Add a safety report if site H&S review is due.");
  }
  if (!typeCounts.has("Quality Report")) {
    recommendedActions.push("Upload a quality inspection report for QA traceability.");
  }
  if (latestReportAge != null && latestReportAge > 30) {
    recommendedActions.push("Schedule the next progress report — last upload is over 30 days old.");
  }
  if (openIssues.length > 0) {
    recommendedActions.push("Review open issues before the next client walkthrough.");
  }
  recommendedActions.push("Share the reports digest with stakeholders for audit-ready visibility.");
  if (recommendedActions.length === 0) {
    recommendedActions.push("Keep monthly report cadence aligned with scan uploads.");
  }

  return {
    overallProgress,
    reportDigest,
    keyChanges,
    pendingActivities: pendingActivities.slice(0, 6),
    criticalRisks,
    recommendedActions: recommendedActions.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
