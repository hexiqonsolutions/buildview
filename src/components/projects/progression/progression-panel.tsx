"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Layers, Loader2 } from "lucide-react";
import {
  selectProgressionFloor,
  setProgressionStep,
} from "@/lib/actions/progression";
import type {
  FloorProgressionSummary,
  ProjectProgressionBundle,
  ProjectProgressionView,
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

function patchStepLocally(
  bundle: ProjectProgressionBundle,
  stepId: string,
  completed: boolean,
  workDate: string
): ProjectProgressionBundle {
  const selected = bundle.selected;
  if (!selected) return bundle;

  const phases = selected.phases.map((phase) => {
    const steps = phase.steps.map((step) => {
      if (step.id !== stepId) return step;
      return completed
        ? {
            ...step,
            status: "completed" as const,
            workDate,
            completedAt: new Date().toISOString(),
          }
        : {
            ...step,
            status: "pending" as const,
            workDate: null,
            completedAt: null,
            completedBy: null,
            completedByName: null,
            note: null,
          };
    });
    const phaseCompleted = steps.filter((s) => s.status === "completed").length;
    return {
      ...phase,
      steps,
      completed: phaseCompleted,
      percent:
        phase.total > 0 ? Math.round((phaseCompleted / phase.total) * 100) : 0,
    };
  });

  const completedCount = phases.reduce((sum, p) => sum + p.completed, 0);
  const totalCount = selected.totalCount;
  const overallPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activated = completedCount > 0;

  const nextSelected: ProjectProgressionView = {
    ...selected,
    phases,
    completedCount,
    overallPercent,
    activated,
  };

  const floors = bundle.floors.map((floor) =>
    floor.floorId === selected.floorId
      ? {
          ...floor,
          completedCount,
          totalCount,
          percent: overallPercent,
          activated,
        }
      : floor
  );

  const activatedFloors = floors.filter((f) => f.activated);
  let projectCompleted = 0;
  let projectTotal = 0;
  for (const floor of activatedFloors) {
    projectCompleted += floor.completedCount;
    projectTotal += floor.totalCount;
  }

  return {
    ...bundle,
    floors,
    selected: nextSelected,
    activatedFloorCount: activatedFloors.length,
    overallPercent:
      projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0,
  };
}

function FloorChip({
  floor,
  active,
  disabled,
  onSelect,
}: {
  floor: FloorProgressionSummary;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "shrink-0 cursor-pointer rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-150",
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
        disabled && "opacity-60"
      )}
    >
      <span className="block text-xs font-medium leading-tight">{floor.floorName}</span>
      <span
        className={cn(
          "block text-[10px] tabular-nums leading-tight",
          active ? "text-white/70 dark:text-slate-500" : "text-slate-400"
        )}
      >
        {floor.activated ? `${floor.percent}%` : "—"}
      </span>
    </button>
  );
}

export function ProgressionPanel({
  initial,
  compact = false,
}: {
  initial: ProjectProgressionBundle;
  /** Overview embed: project health + compact floor picker. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when floor checklist identity changes
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

  function syncFloorInUrl(floorId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    params.set("floor", floorId);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function selectFloor(floorId: string) {
    if (selected?.floorId === floorId || switching) return;
    setError(null);
    setSwitching(true);
    syncFloorInUrl(floorId);
    startTransition(async () => {
      const result = await selectProgressionFloor(data.projectId, floorId);
      setSwitching(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.progression);
    });
  }

  function onToggle(stepId: string, completed: boolean) {
    if (!data.canEdit || !selected || pendingStepId) return;
    setError(null);
    const snapshot = data;
    setData(patchStepLocally(data, stepId, completed, workDate));
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
        setData(snapshot);
        setError(result.error);
        return;
      }
      if (result.progression) setData(result.progression);
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
          <div className="min-w-0 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                {data.activatedFloorCount}/{data.floorCount} floors activated
              </p>
              {data.floors.length > 0 ? (
                <select
                  aria-label="Jump to floor checklist"
                  className="max-w-[14rem] cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={selected?.floorId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) openFullTab(id);
                  }}
                >
                  {data.floors.map((floor) => (
                    <option key={floor.floorId} value={floor.floorId}>
                      {floor.buildingName} · {floor.floorName}
                      {floor.activated ? ` (${floor.percent}%)` : ""}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {data.floors.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                Add buildings and floors in admin to start monitoring.
              </p>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {data.floors.map((floor) => (
                  <FloorChip
                    key={floor.floorId}
                    floor={floor}
                    active={selected?.floorId === floor.floorId}
                    onSelect={() => openFullTab(floor.floorId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Progression Report
          </h3>
          <p className="text-sm text-slate-500">
            Project health{" "}
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
            Ask BuildView to add buildings and floors on this project.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {buildings.map((building) => (
              <div key={building.buildingId} className="space-y-1.5">
                {buildings.length > 1 ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Building2 className="h-3 w-3" aria-hidden />
                    {building.buildingName}
                  </p>
                ) : null}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {building.floors.map((floor) => (
                    <FloorChip
                      key={floor.floorId}
                      floor={floor}
                      active={selected?.floorId === floor.floorId}
                      disabled={switching || isPending}
                      onSelect={() => selectFloor(floor.floorId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {switching && !selected ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading floor…
            </div>
          ) : selected ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                {switching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span className="font-medium text-slate-900 dark:text-white">
                  {selected.buildingName} · {selected.floorName}
                </span>
                <span className="text-slate-400">·</span>
                <span className="tabular-nums">
                  {selected.completedCount}/{selected.totalCount} · {selected.overallPercent}%
                </span>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <ProgressionOverallCard
                  percent={selected.overallPercent}
                  completed={selected.completedCount}
                  total={selected.totalCount}
                  label={selected.floorName}
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

              <div className="space-y-2">
                {selected.phases.map((phase) => {
                  const open = openPhases.has(phase.number);
                  return (
                    <div
                      key={phase.number}
                      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => togglePhase(phase.number)}
                        aria-expanded={open}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 bg-slate-50 px-3 py-2.5 text-left dark:bg-slate-900/50"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Phase {phase.number}
                          </p>
                          <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
                            {phase.name}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs tabular-nums text-slate-500">
                            {phase.completed}/{phase.total}
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
                                className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                              >
                                <button
                                  type="button"
                                  disabled={!data.canEdit || Boolean(pendingStepId)}
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
          ) : null}
        </>
      )}
    </div>
  );
}
