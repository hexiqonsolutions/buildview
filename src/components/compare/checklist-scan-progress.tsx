"use client";

import { useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";
import type { ChecklistScanProgress } from "@/lib/comparison/types";
import { PROGRESSION_TRACK_LABELS, type ProgressionTrack } from "@/lib/progression/catalog";
import { formatPercent } from "@/lib/progression/completion";
import { cn, formatDate } from "@/lib/utils";

const COLLAPSED_COUNT = 6;

function deltaLabel(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  if (rounded > 0) return `+${text} pts`;
  if (rounded < 0) return `−${text.replace("-", "")} pts`;
  return "No change";
}

/**
 * Checklist completion at each scan's capture date, the change between them,
 * and the steps ended in that window. Same formula as the Completion card.
 */
export function ChecklistScanProgressCard({ progress }: { progress: ChecklistScanProgress }) {
  const [expanded, setExpanded] = useState(false);
  const steps = expanded ? progress.stepsBetween : progress.stepsBetween.slice(0, COLLAPSED_COUNT);
  const hidden = progress.stepsBetweenCount - steps.length;

  return (
    <section aria-label="Checklist progress at these scans" className="compare-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
            <ListChecks className="h-4 w-4 text-slate-500" aria-hidden />
            Checklist progress at these scans
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{progress.scopeLabel}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
            progress.delta > 0
              ? "bg-brand-accent/20 text-[#3f5d12] dark:text-brand-accent"
              : progress.delta < 0
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          )}
        >
          {deltaLabel(progress.delta)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Scan A · {formatDate(progress.scanA.date)}</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatPercent(progress.scanA.percent)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
          <p className="text-xs text-slate-500">Scan B · {formatDate(progress.scanB.date)}</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatPercent(progress.scanB.percent)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {progress.stepsBetweenCount === 0
            ? "No checklist steps were ended between these scans."
            : `${progress.stepsBetweenCount} step${progress.stepsBetweenCount === 1 ? "" : "s"} ended between these scans`}
        </p>
        {steps.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {steps.map((step) => (
              <li key={`${step.floorLabel}-${step.track}-${step.stepNumber}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-800 dark:text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-500">
                    {PROGRESSION_TRACK_LABELS[step.track as ProgressionTrack] ?? step.track} · Step {step.stepNumber}
                    {progress.scope === "project" ? ` · ${step.floorLabel}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatDate(step.date)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {progress.stepsBetween.length > COLLAPSED_COUNT ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 min-h-11 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            {expanded ? "Show fewer" : `Show all ${progress.stepsBetween.length}`}
          </button>
        ) : null}
        {expanded && hidden > 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            Plus {hidden} more; open the Progression tab for the full list.
          </p>
        ) : null}
      </div>
    </section>
  );
}
