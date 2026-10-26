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
      const value = Math.floor(diffSec / secondsInUnit);
      return rtf.format(-value, unit);
    }
  }
  return "just now";
}

/** Up to two uppercase initials from a name, falling back to the email, then "?". */
export function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/** Human-readable time-on-site duration (e.g. "4h 32m", "2d 5h", "12m"). */
export function formatTimeOnSite(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return seconds < 5 ? "—" : `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function getStatusColor(status: string): string {
  // Minimal slate system — differentiate by weight, not rainbow accents
  const colors: Record<string, string> = {
    planning: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    in_progress: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
    completed: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    on_hold: "bg-slate-100 text-slate-600 ring-1 ring-dashed ring-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-600",
    archived: "bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800",
    suspended: "bg-slate-100 text-slate-600 ring-1 ring-dashed ring-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-600",
    open: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    resolved: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    closed: "bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-800",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    medium: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    high: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
    critical: "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
    draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    sent: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    paid: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
    overdue: "bg-slate-950 text-white dark:bg-white dark:text-slate-950",
    cancelled: "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-500",
  };
  return colors[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function getProjectProgressPercent(status: string): number {
  const map: Record<string, number> = {
    planning: 15,
    in_progress: 62,
    on_hold: 45,
    completed: 100,
    archived: 100,
    suspended: 0,
  };
  return map[status] ?? 20;
}

export function getProjectStageLabel(status: string): string {
  const map: Record<string, string> = {
    planning: "Pre-Construction",
    in_progress: "Active Construction",
    on_hold: "On Hold",
    completed: "Handover",
    archived: "Archived",
    suspended: "Suspended",
  };
  return map[status] ?? formatStatus(status);
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
