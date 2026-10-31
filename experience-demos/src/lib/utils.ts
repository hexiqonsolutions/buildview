import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const target = new Date(date).getTime();
  const diffMs = Date.now() - target;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, secondsInUnit] of units) {
    if (diffSec >= secondsInUnit) {
      return rtf.format(-Math.floor(diffSec / secondsInUnit), unit);
    }
  }
  return "just now";
}

export function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planning: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
    in_progress: "bg-slate-800 text-white",
    completed: "bg-slate-200 text-slate-800",
    on_hold: "bg-slate-100 text-slate-600 ring-1 ring-dashed ring-slate-300",
    archived: "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
    open: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
    in_progress_issue: "bg-slate-800 text-white",
    resolved: "bg-slate-200 text-slate-800",
    closed: "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
    low: "bg-slate-100 text-slate-600",
    medium: "bg-slate-200 text-slate-700",
    high: "bg-slate-800 text-white",
    critical: "bg-slate-950 text-white",
  };
  return colors[status] || "bg-slate-100 text-slate-700";
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
