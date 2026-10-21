"use client";

import type {
  ProgressionDailyPoint,
  ProgressionPhaseView,
  ProgressionWeeklyPoint,
} from "@/lib/progression/types";
import { cn } from "@/lib/utils";

function formatDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}

export function ProgressionOverallCard({
  percent,
  completed,
  total,
  label = "Overall progression",
  accentClassName = "text-slate-800 dark:text-slate-200",
}: {
  percent: number;
  completed: number;
  total: number;
  label?: string;
  accentClassName?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn("transition-all duration-500", accentClassName)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {percent}%
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
          {completed} of {total} steps complete
        </p>
        <p className="mt-0.5 text-xs text-slate-500">From daily checklist ticks</p>
      </div>
    </div>
  );
}

export function ProgressionPhaseBars({ phases }: { phases: ProgressionPhaseView[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Phase completion
      </p>
      <div className="mt-3 space-y-2.5">
        {phases.map((phase) => (
          <div key={phase.number}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-700 dark:text-slate-300">
                {phase.number}. {phase.name}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {phase.completed}/{phase.total} · {phase.percent}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-800 transition-[width] duration-500 dark:bg-slate-200"
                style={{ width: `${phase.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressionDailyChart({
  daily,
  accentClassName = "bg-slate-800 dark:bg-slate-200",
}: {
  daily: ProgressionDailyPoint[];
  accentClassName?: string;
}) {
  const max = Math.max(1, ...daily.map((d) => d.completions));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Daily completions (14 days)
      </p>
      <div className="mt-4 flex h-28 items-end gap-1 sm:gap-1.5">
        {daily.map((point) => {
          const height = Math.max(point.completions === 0 ? 2 : 8, Math.round((point.completions / max) * 100));
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-slate-400">
                {point.completions || ""}
              </span>
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-sm transition-all duration-300",
                  point.completions > 0
                    ? accentClassName
                    : "bg-slate-100 dark:bg-slate-800"
                )}
                style={{ height: `${height}%` }}
                title={`${formatDayLabel(point.date)}: ${point.completions}`}
              />
              <span className="max-w-full truncate text-[9px] text-slate-400">
                {formatDayLabel(point.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressionWeeklyChart({ weekly }: { weekly: ProgressionWeeklyPoint[] }) {
  const max = Math.max(1, ...weekly.map((w) => w.completions));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Weekly completions (8 weeks)
      </p>
      <div className="mt-4 flex h-28 items-end gap-1.5 sm:gap-2">
        {weekly.map((point) => {
          const height = Math.max(point.completions === 0 ? 2 : 8, Math.round((point.completions / max) * 100));
          return (
            <div key={point.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-slate-400">
                {point.completions || ""}
              </span>
              <div
                className={cn(
                  "w-full max-w-8 rounded-t-sm transition-all duration-300",
                  point.completions > 0
                    ? "bg-slate-800 dark:bg-slate-200"
                    : "bg-slate-100 dark:bg-slate-800"
                )}
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.completions}`}
              />
              <span className="max-w-full truncate text-[9px] text-slate-400">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
