"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Layers, Loader2 } from "lucide-react";
import { setProgressionStep } from "@/lib/actions/progression";
import type {
  FloorProgressionSummary,
  ProjectProgressionBundle,
} from "@/lib/progression/types";
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

function groupFloorsByBuilding(floors: FloorProgressionSummary[]) {
  const map = new Map<string, { buildingName: string; floors: FloorProgressionSummary[] }>();
  for (const floor of floors) {
    const entry = map.get(floor.buildingId) ?? {
      buildingName: floor.buildingName,
      floors: [],
    };
    entry.floors.push(floor);
    map.set(floor.buildingId, entry);
  }
  return Array.from(map.entries()).map(([buildingId, value]) => ({
    buildingId,
    ...value,
  }));
}

export function ProgressionPanel({
  initial,
  compact = false,
}: {
  initial: ProjectProgressionBundle;
  /** Overview embed: project health + floor strip, link to full tab. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  useEffect(() => {
    setData(initial);
  }, [initial]);

  const selected = data.selected;
  const [workDate, setWorkDate] = useState(todayIso);
  const [openPhases, setOpenPhases] = useState<Set<number>>(
    () =>
      new Set(
        (initial.selected?.phases ?? [])
          .filter((p) => p.completed < p.total)
          .map((p) => p.number)
          .slice(0, 2)
      )
  );
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setOpenPhases(
      new Set(
        selected.phases.filter((p) => p.completed < p.total).map((p) => p.number).slice(0, 2)
      )
    );
    // Reset open phases when the selected floor checklist changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-open on floor change
  }, [selected?.id]);

  const nextPending = useMemo(
    () => selected?.phases.flatMap((p) => p.steps).find((s) => s.status !== "completed") ?? null,
    [selected]
  );

  const buildings = useMemo(() => groupFloorsByBuilding(data.floors), [data.floors]);

  function togglePhase(n: number) {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function selectFloor(floorId: string) {
    if (selected?.floorId === floorId) return;
    setSwitching(true);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    params.set("floor", floorId);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    router.refresh();
    // Soft unlock after navigation; server will replace `initial`
    setTimeout(() => setSwitching(false), 800);
  }

  function onToggle(stepId: string, completed: boolean) {
    if (!data.canEdit || !selected) return;
    setError(null);
    setPendingStepId(stepId);
    startTransition(async () => {
      const result = await setProgressionStep({
        projectId: data.projectId,
        floorId: selected.floorId,
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

  function openFullTab(floorId?: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    if (floorId) params.set("floor", floorId);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
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
              Project health by floor
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.activatedFloorCount} of {data.floorCount} floor
              {data.floorCount === 1 ? "" : "s"} activated · overall from activated floors only
            </p>
          </div>
          <button
            type="button"
            onClick={() => openFullTab(selected?.floorId)}
            className="cursor-pointer text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
          >
            Open checklist
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_1fr]">
          <ProgressionOverallCard
            percent={data.overallPercent}
            completed={data.floors
              .filter((f) => f.activated)
              .reduce((sum, f) => sum + f.completedCount, 0)}
            total={data.floors
              .filter((f) => f.activated)
              .reduce((sum, f) => sum + f.totalCount, 0)}
            label="Project health"
          />
          <div className="intel-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
            {data.floors.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Add buildings and floors in admin to start floor-by-floor progression.
              </p>
            ) : (
              data.floors.map((floor) => (
                <button
                  key={floor.floorId}
                  type="button"
                  onClick={() => openFullTab(floor.floorId)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {floor.buildingName}
                      <span className="text-slate-300 dark:text-slate-600"> · </span>
                      {floor.floorName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {floor.activated
                        ? `${floor.completedCount}/${floor.totalCount} steps`
                        : "Not started — excluded from project health"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-display text-sm font-semibold tabular-nums",
                      floor.activated
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    )}
                  >
                    {floor.activated ? `${floor.percent}%` : "—"}
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-800 transition-[width] duration-300 dark:bg-slate-200"
                      style={{ width: `${floor.activated ? floor.percent : 0}%` }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
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
            Each floor has the same post-slab sequence. Tick work on the selected floor. Project
            health averages floors that have at least one tick.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Project health:{" "}
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {data.overallPercent}%
            </span>
            {" · "}
            {data.activatedFloorCount}/{data.floorCount} floors activated
          </p>
        </div>
        {data.canEdit && selected ? (
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
        ) : !data.canEdit ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
            View only — Client Admin, Site Engineer, Site Supervisor, and BuildView staff can tick
            steps.
          </p>
        ) : null}
      </div>

      {data.floors.length === 0 ? (
        <div className="intel-card px-6 py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-100">
            No floors to monitor yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Ask BuildView to add buildings and floors on this project. Each floor will get its own
            56-step checklist.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Select floor
            </p>
            {buildings.map((building) => (
              <div key={building.buildingId} className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {building.buildingName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {building.floors.map((floor) => {
                    const active = selected?.floorId === floor.floorId;
                    return (
                      <button
                        key={floor.floorId}
                        type="button"
                        disabled={switching}
                        onClick={() => selectFloor(floor.floorId)}
                        className={cn(
                          "cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-150",
                          active
                            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        )}
                      >
                        <span className="block text-sm font-medium">{floor.floorName}</span>
                        <span
                          className={cn(
                            "block text-[10px] tabular-nums",
                            active ? "text-white/70 dark:text-slate-500" : "text-slate-400"
                          )}
                        >
                          {floor.activated ? `${floor.percent}%` : "Not started"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {switching || !selected ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading floor checklist…
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <ProgressionOverallCard
                  percent={selected.overallPercent}
                  completed={selected.completedCount}
                  total={selected.totalCount}
                  label={`${selected.buildingName} · ${selected.floorName}`}
                />
                <ProgressionPhaseBars phases={selected.phases} />
                <ProgressionDailyChart daily={selected.daily} />
                <ProgressionWeeklyChart weekly={selected.weekly} />
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
                {selected.phases.map((phase) => {
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
                        className="flex w-full cursor-pointer items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left dark:bg-slate-900/50"
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
            </>
          )}
        </>
      )}
    </div>
  );
}
