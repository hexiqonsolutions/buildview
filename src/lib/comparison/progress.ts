import type { TimelineEventWithRelations } from "@/lib/types";
import type {
  EnrichedTour,
  ScanProgress,
  TradeProgressItem,
} from "@/lib/comparison/types";
import { DEFAULT_TRADE_NAMES, normalizeTrades } from "@/lib/timeline/admin-timeline";

export const EMPTY_SCAN_PROGRESS: ScanProgress = {
  overall: null,
  trades: new Map(),
  source: null,
};

/** `YYYY-MM-DD` without timezone conversion, so date-only values compare correctly. */
function calendarDay(value: string | null | undefined): string {
  return (value ?? "").slice(0, 10);
}

function hasRecordedProgress(event: TimelineEventWithRelations): boolean {
  return typeof event.progress_percent === "number" || normalizeTrades(event.trades).length > 0;
}

function compareChronologically(a: TimelineEventWithRelations, b: TimelineEventWithRelations) {
  const byDate = a.event_date.localeCompare(b.event_date);
  if (byDate !== 0) return byDate;
  const bySort = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (bySort !== 0) return bySort;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

/**
 * Progress as recorded in Timeline at the time of a scan: entries dated on or before
 * the capture date, with entries linked to the scan itself taking precedence.
 * Later entries override earlier ones per field (overall and each trade).
 */
export function getScanProgress(
  scan: EnrichedTour,
  timeline: TimelineEventWithRelations[]
): ScanProgress {
  const scanDay = calendarDay(scan.capture_date ?? scan.created_at);
  const recorded = timeline.filter(hasRecordedProgress);
  const dated = recorded
    .filter((event) => event.tour_id !== scan.id && calendarDay(event.event_date) <= scanDay)
    .sort(compareChronologically);
  const linked = recorded
    .filter((event) => event.tour_id === scan.id)
    .sort(compareChronologically);

  let overall: number | null = null;
  const trades = new Map<string, number>();
  let source: ScanProgress["source"] = null;

  for (const event of [...dated, ...linked]) {
    if (typeof event.progress_percent === "number") {
      overall = Math.min(100, Math.max(0, Math.round(event.progress_percent)));
    }
    for (const trade of normalizeTrades(event.trades)) {
      trades.set(trade.name, trade.percent);
    }
    source = {
      eventId: event.id,
      title: event.title,
      date: event.event_date,
      linkedToScan: event.tour_id === scan.id,
    };
  }

  return { overall, trades, source };
}

function tradeStatus(after: number | null): TradeProgressItem["status"] {
  if (after == null) return "not_recorded";
  if (after >= 100) return "completed";
  if (after > 0) return "in_progress";
  return "pending";
}

export function buildTradeProgress(
  scanA: ScanProgress,
  scanB: ScanProgress
): TradeProgressItem[] {
  const names = [...new Set([...scanA.trades.keys(), ...scanB.trades.keys()])];
  const defaultOrder: readonly string[] = DEFAULT_TRADE_NAMES;
  const rank = (name: string) => {
    const index = defaultOrder.indexOf(name);
    return index === -1 ? defaultOrder.length : index;
  };
  names.sort((a, b) => rank(a) - rank(b));

  return names.map((trade) => {
    const before = scanA.trades.get(trade) ?? null;
    const after = scanB.trades.get(trade) ?? null;
    return {
      trade,
      status: tradeStatus(after),
      before,
      after,
      delta: before != null && after != null ? after - before : null,
    };
  });
}
