import type {
  IssueWithRelations,
  Report,
  TimelineEventWithRelations,
} from "@/lib/types";
import type { EnrichedTour } from "@/lib/comparison/types";
import { getTourDate } from "@/lib/comparison/metadata";

export type ComparisonDateWindow = {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  scanA: EnrichedTour;
  scanB: EnrichedTour;
};

export function getComparisonWindow(
  scanA: EnrichedTour,
  scanB: EnrichedTour
): ComparisonDateWindow {
  const a = getTourDate(scanA);
  const b = getTourDate(scanB);
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    scanA: a <= b ? scanA : scanB,
    scanB: a <= b ? scanB : scanA,
  };
}

export function isInWindow(date: string | Date | null | undefined, window: ComparisonDateWindow): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return d >= window.from && d <= window.to;
}

export function isOnOrAfterScanA(
  date: string | Date | null | undefined,
  window: ComparisonDateWindow
): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return d >= window.from;
}

export function filterByCreatedAt<T extends { created_at: string }>(
  items: T[],
  window: ComparisonDateWindow
): T[] {
  return items.filter((item) => isInWindow(item.created_at, window));
}

export function filterReportsInWindow(reports: Report[], window: ComparisonDateWindow): Report[] {
  return reports.filter((report) => isInWindow(report.report_date, window));
}

export function filterTimelineInWindow(
  events: TimelineEventWithRelations[],
  window: ComparisonDateWindow
): TimelineEventWithRelations[] {
  return events.filter((event) => isInWindow(event.event_date, window));
}

export function filterIssuesInWindow(
  issues: IssueWithRelations[],
  window: ComparisonDateWindow
): IssueWithRelations[] {
  return issues.filter((issue) => {
    if (isInWindow(issue.created_at, window)) return true;
    if (issue.resolved_at && isInWindow(issue.resolved_at, window)) return true;
    return false;
  });
}

export type ComparisonPhoto = {
  id: string;
  url: string;
  caption: string | null;
  date: string;
  eventTitle: string;
};

export function extractPhotosFromEvents(
  events: TimelineEventWithRelations[],
  window: ComparisonDateWindow,
  side: "before" | "after"
): ComparisonPhoto[] {
  const midpoint = window.from.getTime() + (window.to.getTime() - window.from.getTime()) / 2;

  return events.flatMap((event) => {
    const eventTime = new Date(event.event_date).getTime();
    const isAfter = eventTime >= midpoint;
    if (side === "before" && isAfter) return [];
    if (side === "after" && !isAfter) return [];

    return (event.timeline_photos ?? []).map((photo) => ({
      id: photo.id,
      url: photo.image_url,
      caption: photo.caption,
      date: event.event_date,
      eventTitle: event.title,
    }));
  });
}

export function formatWindowLabel(window: ComparisonDateWindow): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(window.from)} → ${fmt(window.to)}`;
}

export function documentAppearedAfterScanA(
  item: { created_at: string },
  window: ComparisonDateWindow
): boolean {
  return isOnOrAfterScanA(item.created_at, window);
}
