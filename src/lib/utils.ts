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

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
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

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getProjectProgressPercent(status: string): number {
  const map: Record<string, number> = {
    planning: 15,
    in_progress: 62,
    on_hold: 45,
    completed: 100,
  };
  return map[status] ?? 20;
}

export function getProjectStageLabel(status: string): string {
  const map: Record<string, string> = {
    planning: "Pre-Construction",
    in_progress: "Active Construction",
    on_hold: "On Hold",
    completed: "Handover",
  };
  return map[status] ?? formatStatus(status);
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export {
  extractMatterportModelId,
  getMatterportEmbedUrl,
  getMatterportShareUrl,
  isValidMatterportUrl,
  normalizeMatterportUrl,
} from "@/lib/matterport";
