"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ProjectCompletion } from "@/lib/progression/checklist-completion";
import {
  SCHEDULE_STATUS_LABELS,
  formatPercent,
  type ScheduleStatus,
} from "@/lib/progression/completion";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<ScheduleStatus, string> = {
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  ahead: "bg-brand-accent/20 text-[#3f5d12] dark:text-brand-accent",
  behind_lt20: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  behind_gte20: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  not_started: "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  no_schedule: "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function signedPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : "±"}${text.replace("-", "")} pts`;
}

/**
 * Completion hero: actual vs planned with a colour-coded status, and a
 * "How is this calculated?" drawer generated from the same formula module.
 */
export function CompletionHero({
  completion,
  className,
}: {
  completion: ProjectCompletion;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { actual, planned, summary, floorCount, scheduledFloorCount } = completion;
  const unstarted = completion.floors.filter((f) => f.actual <= 0).length;

  return (
    <section
      aria-label="Project completion"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completion</p>
          <p className="mt-1 font-display text-5xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatPercent(actual)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Across {floorCount} floor{floorCount === 1 ? "" : "s"}
            {unstarted > 0 ? ` · ${unstarted} not started yet (counted as 0%)` : ""}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_CLASS[summary.status])}>
            {SCHEDULE_STATUS_LABELS[summary.status]}
          </span>
          {planned != null ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Planned <span className="font-semibold tabular-nums">{formatPercent(planned)}</span>
              {summary.variance != null ? (
                <span
                  className={cn(
                    "ml-2 font-semibold tabular-nums",
                    summary.variance >= 0 ? "text-[#3f5d12] dark:text-brand-accent" : "text-red-600"
                  )}
                >
                  {signedPoints(summary.variance)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Add start and deadline dates to compare with the plan.</p>
          )}
          {planned != null && scheduledFloorCount < floorCount ? (
            <p className="text-xs text-slate-500">
              Plan covers {scheduledFloorCount} of {floorCount} floors
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-accent-dark"
          style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      >
        <Info className="h-4 w-4" aria-hidden />
        How is this calculated?
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>How completion is calculated</SheetTitle>
            <p className="text-sm text-slate-500">
              The same formula produces every number on this page, the dashboards and exports.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">1. Each floor</h3>
              <p>
                Every floor has two checklists (Pre-Slab and Post-Slab, 56 steps each). A step
                counts once it is ended; steps in progress don&apos;t count yet. Floor % =
                ended steps ÷ all steps on that floor.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">2. The project</h3>
              <p>
                Project % is the average of all {floorCount} floors, each weighted equally.
                Floors that haven&apos;t started count as 0%, so the number reflects the whole
                building, not just the floors in work.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">3. The plan</h3>
              <p>
                For a floor with a start date and deadline, planned % = days elapsed ÷ days in
                the window (0% before the start, 100% after the deadline).
                {planned != null
                  ? ` Today that gives ${formatPercent(planned)} across the ${scheduledFloorCount} scheduled floor${scheduledFloorCount === 1 ? "" : "s"}.`
                  : " No floor has dates yet."}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">4. Status</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>Complete: 100%.</li>
                <li>On track: actual is at or above planned.</li>
                <li>Behind &lt;20% / ≥20%: how far below plan, as a share of planned.</li>
                <li>Not started: nothing ended yet.</li>
                <li>No schedule: no floor has dates.</li>
              </ul>
              {summary.behind != null && summary.behind > 0 ? (
                <p className="mt-2">
                  Right now: {formatPercent(summary.behind)} behind plan (
                  {signedPoints(summary.variance ?? 0)}).
                </p>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
