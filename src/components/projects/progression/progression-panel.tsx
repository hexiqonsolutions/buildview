"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { setProgressionStep } from "@/lib/actions/progression";
import type { ProjectProgressionView } from "@/lib/progression/types";
import { formatDate, cn } from "@/lib/utils";
import {
  ProgressionDailyChart,
  ProgressionOverallCard,
  ProgressionPhaseBars,
  ProgressionWeeklyChart,
} from "@/components/projects/progression/progression-charts";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProgressionPanel({
  initial,
  compact = false,
}: {
  initial: ProjectProgressionView;
  /** Overview embed: charts only, link to full tab. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  useEffect(() => {
    setData(initial);
  }, [initial]);
  const [workDate, setWorkDate] = useState(todayIso);
  const [openPhases, setOpenPhases] = useState<Set<number>>(
    () => new Set(initial.phases.filter((p) => p.completed < p.total).map((p) => p.number).slice(0, 2))
  );
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextPending = useMemo(
    () => data.phases.flatMap((p) => p.steps).find((s) => s.status !== "completed") ?? null,
    [data]
  );

  function togglePhase(n: number) {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function onToggle(stepId: string, completed: boolean) {
    if (!data.canEdit) return;
    setError(null);
    setPendingStepId(stepId);
    startTransition(async () => {
      const result = await setProgressionStep({
        projectId: data.projectId,
        stepId,
        completed,
        workDate,
        note: null,
      });
      setPendingStepId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.progression) setData(result.progression);
      router.refresh();
    });
  }

  if (compact) {
    return (
      <section aria-label="Progression Report" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Progression Report
            </p>
            <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-900 dark:text-white">
              Construction sequence progress
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "progression");
              router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
            }}
            className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
          >
            Open checklist
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ProgressionOverallCard
            percent={data.overallPercent}
            completed={data.completedCount}
            total={data.totalCount}
          />
          <ProgressionPhaseBars phases={data.phases} />
          <ProgressionDailyChart daily={data.daily} />
          <ProgressionWeeklyChart weekly={data.weekly} />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Progression Report
          </h3>
          <p className="text-sm text-slate-500">
            Post-slab construction sequence ({data.totalCount} steps). Tick work as it is completed
            on site. Each tick updates overall and phase progress.
          </p>
        </div>
        {data.canEdit ? (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Work date
            </span>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
            View only — Client Admin, Site Engineer, Site Supervisor, and BuildView staff can tick
            steps.
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ProgressionOverallCard
          percent={data.overallPercent}
          completed={data.completedCount}
          total={data.totalCount}
        />
        <ProgressionPhaseBars phases={data.phases} />
        <ProgressionDailyChart daily={data.daily} />
        <ProgressionWeeklyChart weekly={data.weekly} />
      </div>

      {nextPending && data.canEdit ? (
        <p className="text-xs text-slate-500">
          Suggested next:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Step {nextPending.stepNumber} — {nextPending.title}
          </span>
        </p>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {data.phases.map((phase) => {
          const open = openPhases.has(phase.number);
          return (
            <div
              key={phase.number}
              className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
            >
              <button
                type="button"
                onClick={() => togglePhase(phase.number)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left dark:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Phase {phase.number} · {phase.stage}
                  </p>
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {phase.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs tabular-nums text-slate-500">
                    {phase.completed}/{phase.total} · {phase.percent}%
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {open ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {phase.steps.map((step) => {
                    const done = step.status === "completed";
                    const busy = isPending && pendingStepId === step.id;
                    return (
                      <li
                        key={step.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      >
                        <button
                          type="button"
                          disabled={!data.canEdit || busy}
                          onClick={() => onToggle(step.id, !done)}
                          aria-pressed={done}
                          aria-label={`${done ? "Reopen" : "Complete"} step ${step.stepNumber}`}
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                            done
                              ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                              : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                            !data.canEdit && "cursor-default opacity-80",
                            data.canEdit && "cursor-pointer"
                          )}
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : done ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm",
                              done
                                ? "text-slate-500 line-through decoration-slate-300"
                                : "text-slate-800 dark:text-slate-100"
                            )}
                          >
                            <span className="mr-1.5 font-medium tabular-nums text-slate-400">
                              {step.stepNumber}.
                            </span>
                            {step.title}
                          </p>
                          {done && step.workDate ? (
                            <p className="mt-0.5 text-xs text-slate-400">
                              Done {formatDate(step.workDate)}
                              {step.completedByName ? ` · ${step.completedByName}` : ""}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
