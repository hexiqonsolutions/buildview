import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";

export const REPORT_RANGES = ["7d", "30d", "90d", "month", "all"] as const;

export type ReportRange = (typeof REPORT_RANGES)[number];

export function isReportRange(value: string | undefined): value is ReportRange {
  return REPORT_RANGES.includes(value as ReportRange);
}

export function getReportRangeBounds(range: ReportRange, now = new Date()) {
  const end = endOfDay(now);

  if (range === "all") {
    return {
      start: null as Date | null,
      end,
      label: "All time",
      dayCount: null as number | null,
    };
  }

  if (range === "month") {
    return {
      start: startOfMonth(now),
      end,
      label: format(now, "MMMM yyyy"),
      dayCount:
        Math.max(
          1,
          Math.round(
            (end.getTime() - startOfMonth(now).getTime()) / (24 * 60 * 60 * 1000)
          ) + 1
        ),
    };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = startOfDay(subDays(now, days - 1));
  return {
    start,
    end,
    label: `Last ${days} days`,
    dayCount: days,
  };
}

export function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function percent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}
