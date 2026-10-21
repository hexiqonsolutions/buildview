"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import {
  endProgressionStep,
  resetProgressionStep,
  selectProgressionSection,
  setProgressionSchedule,
  startProgressionStep,
  updateProgressionStepDates,
  type ProgressionStepPatch,
} from "@/lib/actions/progression";
import {
  PROGRESSION_TRACKS,
  PROGRESSION_TRACK_LABELS,
  type ProgressionTrack,
} from "@/lib/progression/catalog";
import type {
  FloorProgressionSummary,
  ProjectProgressionBundle,
  ProjectProgressionView,
  ProgressionStepView,
} from "@/lib/progression/types";
import { formatDate, cn } from "@/lib/utils";
import {
  ProgressionDailyChart,
  ProgressionOverallCard,
  ProgressionPhaseBars,
  ProgressionWeeklyChart,
} from "@/components/projects/progression/progression-charts";

/* ---------------------------------------------------------------- helpers */

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  // Inputs are wall-clock India time (no DST).
  return new Date(`${value}:00+05:30`).toISOString();
}

function todayKolkataDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Whole days from `from` to `to` (YYYY-MM-DD); negative when `to` has passed. */
function dayDiff(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00+05:30`).getTime() -
      new Date(`${from}T00:00:00+05:30`).getTime()) /
      86_400_000
  );
}

function deadlineStatus(
  plannedEndDate: string | null,
  percent: number
): { label: string; className: string } {
  if (!plannedEndDate) {
    return {
      label: "No deadline set",
      className:
        "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }
  if (percent >= 100) {
    return {
      label: "Completed",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    };
  }
  const diff = dayDiff(todayKolkataDate(), plannedEndDate);
  if (diff < 0) {
    return {
      label: `Overdue by ${Math.abs(diff)}d`,
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    };
  }
  if (diff === 0) {
    return {
      label: "Due today",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    };
  }
  if (diff <= 7) {
    return {
      label: `Due in ${diff}d`,
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    };
  }
  return {
    label: `Due in ${diff}d`,
    className:
      "bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
}

function durationLabel(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "Same day";
  return days === 1 ? "1 day" : `${days} days`;
}

function groupSummariesByBuilding(floors: FloorProgressionSummary[]) {
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

type StepTransition = "start" | "end" | "reset";

/**
 * BuildView track identity: Pre-Slab uses the brand lime family,
 * Post-Slab uses the brand charcoal family. Text labels + subtitles
 * always accompany colour so status is never conveyed by colour alone.
 */
const TRACK_THEMES: Record<
  ProgressionTrack,
  {
    subtitle: string;
    section: string;
    chip: string;
    progress: string;
    startButton: string;
    endButton: string;
  }
> = {
  pre_slab: {
    subtitle: "Before slab casting · structure cycle",
    section:
      "border-[#c3dd8b] border-l-4 border-l-brand-accent-dark bg-[#f7fbec] dark:border-[#4a6b16] dark:border-l-brand-accent dark:bg-[#1c2907]/70",
    chip: "bg-brand-accent text-slate-950",
    progress: "bg-brand-accent-dark dark:bg-brand-accent",
    startButton:
      "border-[#76b82d] text-[#4a6b16] hover:bg-[#76b82d] hover:text-white dark:border-brand-accent dark:text-brand-accent dark:hover:bg-brand-accent dark:hover:text-slate-950",
    endButton:
      "bg-[#76b82d] text-white hover:bg-[#639a26] dark:bg-brand-accent dark:text-slate-950 dark:hover:bg-[#bce065]",
  },
  post_slab: {
    subtitle: "After slab casting · finishing cycle",
    section:
      "border-slate-300 border-l-4 border-l-slate-900 bg-slate-100/90 dark:border-slate-600 dark:border-l-white dark:bg-slate-900/80",
    chip: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
    progress: "bg-slate-900 dark:bg-white",
    startButton:
      "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-200 dark:text-slate-100 dark:hover:bg-slate-200 dark:hover:text-slate-900",
    endButton:
      "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
  },
};

function recomputeBundle(
  bundle: ProjectProgressionBundle,
  track: ProgressionTrack,
  nextSelected: ProjectProgressionView
): ProjectProgressionBundle {
  const floors = bundle.floors.map((floor) =>
    floor.track === track && floor.floorId === nextSelected.floorId
      ? {
          ...floor,
          completedCount: nextSelected.completedCount,
          inProgressCount: nextSelected.inProgressCount,
          totalCount: nextSelected.totalCount,
          percent: nextSelected.overallPercent,
          activated: nextSelected.activated || floor.activated,
        }
      : floor
  );

  const combinedFloors = bundle.combinedFloors.map((combined) => {
    const parts = floors.filter((f) => f.floorId === combined.floorId);
    const completed = parts.reduce((s, f) => s + f.completedCount, 0);
    const inProgress = parts.reduce((s, f) => s + f.inProgressCount, 0);
    const total = parts.reduce((s, f) => s + f.totalCount, 0);
    return {
      ...combined,
      completedCount: completed,
      inProgressCount: inProgress,
      totalCount: total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      activated:
        combined.activated ||
        parts.some((f) => f.completedCount + f.inProgressCount > 0),
    };
  });

  const activatedIds = new Set(
    combinedFloors.filter((f) => f.activated).map((f) => f.floorId)
  );
  const tracks = PROGRESSION_TRACKS.map((t) => {
    let completed = 0;
    let inProgress = 0;
    let total = 0;
    for (const floor of floors) {
      if (floor.track !== t || !activatedIds.has(floor.floorId)) continue;
      completed += floor.completedCount;
      inProgress += floor.inProgressCount;
      total += floor.totalCount;
    }
    return {
      track: t,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedCount: completed,
      inProgressCount: inProgress,
      totalCount: total,
    };
  });

  const activatedFloors = combinedFloors.filter((f) => f.activated);
  const pooledCompleted = activatedFloors.reduce((s, f) => s + f.completedCount, 0);
  const pooledTotal = activatedFloors.reduce((s, f) => s + f.totalCount, 0);

  const selectedByTrack = { ...bundle.selectedByTrack, [track]: nextSelected };
  return {
    ...bundle,
    floors,
    combinedFloors,
    tracks,
    selectedByTrack,
    selected: selectedByTrack.post_slab,
    activatedFloorCount: activatedFloors.length,
    overallPercent:
      pooledTotal > 0 ? Math.round((pooledCompleted / pooledTotal) * 100) : 0,
  };
}

function patchStep(
  bundle: ProjectProgressionBundle,
  track: ProgressionTrack,
  stepId: string,
  patch: (step: ProgressionStepView) => ProgressionStepView
): ProjectProgressionBundle {
  const selected = bundle.selectedByTrack[track];
  if (!selected) return bundle;

  const phases = selected.phases.map((phase) => {
    const steps = phase.steps.map((s) => (s.id === stepId ? patch(s) : s));
    const completed = steps.filter((s) => s.status === "completed").length;
    const inProgress = steps.filter((s) => s.status === "in_progress").length;
    const starts = steps
      .map((s) => s.startedAt ?? s.completedAt)
      .filter((v): v is string => Boolean(v))
      .sort();
    const ends = steps
      .map((s) => s.endedAt ?? s.completedAt)
      .filter((v): v is string => Boolean(v))
      .sort();
    return {
      ...phase,
      steps,
      completed,
      inProgress,
      percent: phase.total > 0 ? Math.round((completed / phase.total) * 100) : 0,
      startedAt: starts[0] ?? null,
      endedAt: ends[ends.length - 1] ?? null,
    };
  });

  const completedCount = phases.reduce((s, p) => s + p.completed, 0);
  const inProgressCount = phases.reduce((s, p) => s + p.inProgress, 0);
  const nextSelected: ProjectProgressionView = {
    ...selected,
    phases,
    completedCount,
    inProgressCount,
    overallPercent:
      selected.totalCount > 0
        ? Math.round((completedCount / selected.totalCount) * 100)
        : 0,
    activated: completedCount + inProgressCount > 0,
  };
  return recomputeBundle(bundle, track, nextSelected);
}

/* ------------------------------------------------------------------- CTA */

/** Overview entry point — opens the Progression tab checklist. */
export function CheckProgressionReportCta({
  overallPercent,
  activatedFloorCount,
  floorCount,
}: {
  overallPercent: number;
  activatedFloorCount: number;
  floorCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function openReport() {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section
      aria-label="Progression Report"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Progression Report
        </p>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
            {overallPercent}%
          </span>
          {" project health"}
          {floorCount > 0 ? (
            <>
              {" · "}
              {activatedFloorCount}/{floorCount} floors activated
            </>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={openReport}
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        Check Progression Report
      </button>
    </section>
  );
}

/* --------------------------------------------------------------- Step row */

function StepRow({
  step,
  track,
  canEdit,
  busy,
  onTransition,
  onSaveDates,
}: {
  step: ProgressionStepView;
  track: ProgressionTrack;
  canEdit: boolean;
  busy: boolean;
  onTransition: (step: ProgressionStepView, transition: StepTransition) => void;
  onSaveDates: (
    step: ProgressionStepView,
    startedAt: string | null,
    endedAt: string | null
  ) => void;
}) {
  const theme = TRACK_THEMES[track];
  const [editingDates, setEditingDates] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const started = step.startedAt ?? step.completedAt;
  const ended = step.endedAt ?? step.completedAt;
  const duration = durationLabel(started, ended);

  function openEditor() {
    setDraftStart(toDateTimeLocal(started));
    setDraftEnd(toDateTimeLocal(ended));
    setDateError(null);
    setEditingDates(true);
  }

  function saveDates() {
    const startedAt = fromDateTimeLocal(draftStart);
    const endedAt = fromDateTimeLocal(draftEnd);
    if (startedAt && endedAt && new Date(endedAt) < new Date(startedAt)) {
      setDateError("End must be after Start.");
      return;
    }
    setEditingDates(false);
    onSaveDates(step, startedAt, endedAt);
  }

  return (
    <li className="px-3 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-800 dark:text-slate-100">
            <span className="mr-1.5 font-medium tabular-nums text-slate-400">
              {step.stepNumber}.
            </span>
            {step.title}
          </p>

          {step.status === "in_progress" ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">In progress</span>
              {" · Started "}
              {formatDateTime(started)}
              {step.startedByName ? ` · by ${step.startedByName}` : ""}
            </p>
          ) : step.status === "completed" ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">Completed</span>
              {started ? ` · ${formatDateTime(started)}` : ""}
              {ended ? ` → ${formatDateTime(ended)}` : ""}
              {duration ? ` · ${duration}` : ""}
              {step.endedByName ?? step.completedByName
                ? ` · Ended by ${step.endedByName ?? step.completedByName}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Not started</p>
          )}
        </div>

        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            {step.status === "pending" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onTransition(step, "start")}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60",
                  theme.startButton
                )}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden />
                )}
                Start
              </button>
            ) : step.status === "in_progress" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onTransition(step, "end")}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60",
                    theme.endButton
                  )}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  End
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Reset step ${step.stepNumber}`}
                  title="Reset step"
                  onClick={() => {
                    if (window.confirm("Reset this step to Not started?")) {
                      onTransition(step, "reset");
                    }
                  }}
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Correct dates for step ${step.stepNumber}`}
                  title="Correct Start/End dates"
                  onClick={openEditor}
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Reset step ${step.stepNumber}`}
                  title="Reset step"
                  onClick={() => {
                    if (window.confirm("Reset this step to Not started?")) {
                      onTransition(step, "reset");
                    }
                  }}
                  className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:hover:text-slate-100"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {canEdit && step.status === "in_progress" ? (
        <button
          type="button"
          onClick={openEditor}
          className="mt-1.5 cursor-pointer text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
        >
          Correct Start date
        </button>
      ) : null}

      {editingDates ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Start date &amp; time
              <input
                type="datetime-local"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-500">
              End date &amp; time
              <input
                type="datetime-local"
                value={draftEnd}
                disabled={step.status !== "completed"}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </div>
          {dateError ? <p className="text-xs text-red-600">{dateError}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDates}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <Check className="h-4 w-4" aria-hidden /> Save dates
            </button>
            <button
              type="button"
              onClick={() => setEditingDates(false)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <X className="h-4 w-4" aria-hidden /> Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/* ----------------------------------------------------------- Schedule bar */

function ScheduleBar({
  selected,
  canEdit,
  saving,
  onSave,
}: {
  selected: ProjectProgressionView;
  canEdit: boolean;
  saving: boolean;
  onSave: (plannedStartDate: string | null, plannedEndDate: string | null) => void;
}) {
  const [draftStart, setDraftStart] = useState(selected.plannedStartDate ?? "");
  const [draftEnd, setDraftEnd] = useState(selected.plannedEndDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const status = deadlineStatus(selected.plannedEndDate, selected.overallPercent);
  const dirty =
    draftStart !== (selected.plannedStartDate ?? "") ||
    draftEnd !== (selected.plannedEndDate ?? "");

  function save() {
    if (draftStart && draftEnd && draftEnd < draftStart) {
      setError("Deadline must be on or after Start.");
      return;
    }
    setError(null);
    onSave(draftStart || null, draftEnd || null);
  }

  return (
    <div className="rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Schedule
        </span>

        {canEdit ? (
          <>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              Start
              <input
                type="date"
                aria-label="Planned start date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              Deadline
              <input
                type="date"
                aria-label="Deadline (planned end date)"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save dates
            </button>
          </>
        ) : (
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {selected.plannedStartDate
              ? formatDate(selected.plannedStartDate)
              : "—"}
            {" → Deadline "}
            {selected.plannedEndDate ? formatDate(selected.plannedEndDate) : "—"}
          </span>
        )}

        <span
          className={cn(
            "ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold",
            status.className
          )}
        >
          {status.label}
        </span>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {canEdit && selected.plannedEndDate ? (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Planned {selected.plannedStartDate ? formatDate(selected.plannedStartDate) : "—"}
          {" → Deadline "}
          {formatDate(selected.plannedEndDate)} · actuals are tracked per step below.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ Track section */

function TrackSection({
  track,
  data,
  switching,
  pendingKeys,
  onSelectFloor,
  onTransition,
  onSaveDates,
  onSaveSchedule,
}: {
  track: ProgressionTrack;
  data: ProjectProgressionBundle;
  switching: boolean;
  pendingKeys: Set<string>;
  onSelectFloor: (track: ProgressionTrack, floorId: string) => void;
  onTransition: (
    track: ProgressionTrack,
    step: ProgressionStepView,
    transition: StepTransition
  ) => void;
  onSaveDates: (
    track: ProgressionTrack,
    step: ProgressionStepView,
    startedAt: string | null,
    endedAt: string | null
  ) => void;
  onSaveSchedule: (
    track: ProgressionTrack,
    plannedStartDate: string | null,
    plannedEndDate: string | null
  ) => void;
}) {
  const selected = data.selectedByTrack[track];
  const trackFloors = useMemo(
    () => data.floors.filter((f) => f.track === track),
    [data.floors, track]
  );
  const buildings = useMemo(
    () => groupSummariesByBuilding(trackFloors),
    [trackFloors]
  );
  const trackSummary = data.tracks.find((t) => t.track === track);
  const label = PROGRESSION_TRACK_LABELS[track];

  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set());
  const phasesRef = useRef(selected?.phases);
  phasesRef.current = selected?.phases;
  const selectedId = selected?.id;
  useEffect(() => {
    const phases = phasesRef.current;
    if (!selectedId || !phases) return;
    setOpenPhases(
      new Set(
        phases
          .filter((p) => p.completed < p.total)
          .map((p) => p.number)
          .slice(0, 1)
      )
    );
  }, [selectedId]);

  const theme = TRACK_THEMES[track];
  const selectedBuildingId =
    selected?.buildingId ?? buildings[0]?.buildingId ?? "";
  const floorsOfBuilding =
    buildings.find((b) => b.buildingId === selectedBuildingId)?.floors ?? [];

  function togglePhase(n: number) {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  return (
    <section
      aria-label={`${label} Progression`}
      className={cn(
        "space-y-3 rounded-2xl border p-3 shadow-xs sm:p-4",
        theme.section
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                theme.chip
              )}
            >
              {label}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {theme.subtitle}
            </span>
          </div>
          <h4 className="sr-only">{label}</h4>
          <p className="text-sm text-slate-500">
            {selected ? (
              <>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {selected.overallPercent}%
                </span>
                {" · "}
                {selected.completedCount}/{selected.totalCount} ended
                {selected.inProgressCount > 0
                  ? ` · ${selected.inProgressCount} in progress`
                  : ""}
              </>
            ) : trackSummary ? (
              `${trackSummary.percent}% · ${trackSummary.completedCount} ended`
            ) : (
              "No checklist yet"
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">
            <span className="sr-only">Tower for {label}</span>
            <select
              aria-label={`${label} tower`}
              value={selectedBuildingId}
              disabled={switching || buildings.length === 0}
              onChange={(e) => {
                const building = buildings.find((b) => b.buildingId === e.target.value);
                const first = building?.floors[0];
                if (first) onSelectFloor(track, first.floorId);
              }}
              className="min-h-11 max-w-44 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {buildings.map((b) => (
                <option key={b.buildingId} value={b.buildingId}>
                  {b.buildingName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            <span className="sr-only">Floor for {label}</span>
            <select
              aria-label={`${label} floor`}
              value={selected?.floorId ?? ""}
              disabled={switching || floorsOfBuilding.length === 0}
              onChange={(e) => {
                if (e.target.value) onSelectFloor(track, e.target.value);
              }}
              className="min-h-11 max-w-44 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {floorsOfBuilding.map((floor) => (
                <option key={floor.floorId} value={floor.floorId}>
                  {floor.floorName}
                  {floor.activated ? ` (${floor.percent}%)` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selected ? (
        <ScheduleBar
          key={selected.id}
          selected={selected}
          canEdit={data.canEdit}
          saving={pendingKeys.has(`${track}:schedule`)}
          onSave={(a, b) => onSaveSchedule(track, a, b)}
        />
      ) : null}

      {selected ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={selected.overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500", theme.progress)}
            style={{ width: `${selected.overallPercent}%` }}
          />
        </div>
      ) : null}

      {switching && !selected ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading floor…
        </div>
      ) : !selected ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Add buildings and floors in admin to start monitoring.
        </p>
      ) : (
        <div className="space-y-2">
          {selected.phases.map((phase) => {
            const open = openPhases.has(phase.number);
            return (
              <div
                key={phase.number}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
              >
                <button
                  type="button"
                  onClick={() => togglePhase(phase.number)}
                  aria-expanded={open}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 bg-slate-50 px-3 py-2.5 text-left dark:bg-slate-900/50"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Phase {phase.number}
                    </p>
                    <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {phase.name}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                      Start {phase.startedAt ? formatDate(phase.startedAt) : "—"}
                      {"  →  End "}
                      {phase.endedAt ? formatDate(phase.endedAt) : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs tabular-nums text-slate-500">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {phase.percent}%
                        </span>{" "}
                        · {phase.completed}/{phase.total}
                        {phase.inProgress > 0 ? (
                          <span className="text-amber-600 dark:text-amber-300">
                            {" "}
                            · {phase.inProgress} in progress
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200/80 sm:w-32 dark:bg-slate-700/70"
                        role="progressbar"
                        aria-valuenow={phase.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${phase.name} progress`}
                      >
                        <span
                          className={cn(
                            "block h-full rounded-full transition-all duration-500",
                            theme.progress
                          )}
                          style={{ width: `${phase.percent}%` }}
                        />
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </div>
                </button>

                {open ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {phase.steps.map((step) => (
                      <StepRow
                        key={step.id}
                        step={step}
                        track={track}
                        canEdit={data.canEdit}
                        busy={pendingKeys.has(`${track}:${step.id}`)}
                        onTransition={(s, t) => onTransition(track, s, t)}
                        onSaveDates={(s, a, b) => onSaveDates(track, s, a, b)}
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Panel */

export function ProgressionPanel({
  initial,
  compact = false,
  checklistOnly = false,
  summaryOnly = false,
}: {
  initial: ProjectProgressionBundle;
  /** @deprecated Prefer summaryOnly or CheckProgressionReportCta. */
  compact?: boolean;
  /** Progression tab: two track sections, no summary charts. */
  checklistOnly?: boolean;
  /** Overview: combined + per-track summary + Check Progression Report CTA. */
  summaryOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(initial);
  const lockedRef = useRef<{ pre: string | null; post: string | null }>({
    pre: initial.selectedByTrack.pre_slab?.floorId ?? null,
    post: initial.selectedByTrack.post_slab?.floorId ?? null,
  });
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [switchingTrack, setSwitchingTrack] = useState<ProgressionTrack | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const serverPre = initial.selectedByTrack.pre_slab?.floorId ?? null;
    const serverPost = initial.selectedByTrack.post_slab?.floorId ?? null;
    const locked = lockedRef.current;
    // Ignore stale RSC payloads that still point at an older floor selection.
    if (
      (locked.pre && serverPre && locked.pre !== serverPre) ||
      (locked.post && serverPost && locked.post !== serverPost)
    ) {
      return;
    }
    setData(initial);
    lockedRef.current = { pre: serverPre ?? locked.pre, post: serverPost ?? locked.post };
  }, [initial]);

  const selectedPost = data.selectedByTrack.post_slab;

  function syncSelectionInUrl(track: ProgressionTrack, floorId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    params.set(track === "pre_slab" ? "preFloor" : "postFloor", floorId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectionsFor(track: ProgressionTrack, floorId: string) {
    return {
      preFloorId:
        track === "pre_slab"
          ? floorId
          : (lockedRef.current.pre ?? data.selectedByTrack.pre_slab?.floorId ?? undefined),
      postFloorId:
        track === "post_slab"
          ? floorId
          : (lockedRef.current.post ?? data.selectedByTrack.post_slab?.floorId ?? undefined),
    };
  }

  function selectFloor(track: ProgressionTrack, floorId: string) {
    const current =
      track === "pre_slab"
        ? data.selectedByTrack.pre_slab?.floorId
        : data.selectedByTrack.post_slab?.floorId;
    if (current === floorId || switchingTrack) return;
    setError(null);
    setSwitchingTrack(track);
    if (track === "pre_slab") lockedRef.current.pre = floorId;
    else lockedRef.current.post = floorId;
    syncSelectionInUrl(track, floorId);
    startTransition(async () => {
      const result = await selectProgressionSection({
        projectId: data.projectId,
        track,
        floorId,
        ...selectionsFor(track, floorId),
      });
      setSwitchingTrack(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      lockedRef.current = {
        pre: result.progression.selectedByTrack.pre_slab?.floorId ?? lockedRef.current.pre,
        post: result.progression.selectedByTrack.post_slab?.floorId ?? lockedRef.current.post,
      };
      setData(result.progression);
    });
  }

  function applyOptimistic(
    track: ProgressionTrack,
    step: ProgressionStepView,
    patch: (s: ProgressionStepView) => ProgressionStepView
  ) {
    setData((prev) => patchStep(prev, track, step.id, patch));
  }

  function markPending(key: string, pending: boolean) {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  /** Merge the server's lightweight step patch over the optimistic state. */
  function reconcileStep(track: ProgressionTrack, serverStep: ProgressionStepPatch) {
    setData((prev) =>
      patchStep(prev, track, serverStep.id, (s) => ({
        ...s,
        status: serverStep.status,
        ...(serverStep.startedAt !== undefined ? { startedAt: serverStep.startedAt } : {}),
        ...(serverStep.startedByName !== undefined
          ? { startedByName: serverStep.startedByName }
          : {}),
        ...(serverStep.endedAt !== undefined ? { endedAt: serverStep.endedAt } : {}),
        ...(serverStep.endedByName !== undefined
          ? { endedByName: serverStep.endedByName }
          : {}),
        ...(serverStep.completedAt !== undefined
          ? { completedAt: serverStep.completedAt }
          : {}),
        ...(serverStep.completedByName !== undefined
          ? { completedByName: serverStep.completedByName }
          : {}),
        ...(serverStep.workDate !== undefined ? { workDate: serverStep.workDate } : {}),
      }))
    );
  }

  function onTransition(
    track: ProgressionTrack,
    step: ProgressionStepView,
    transition: StepTransition
  ) {
    const selected = data.selectedByTrack[track];
    const key = `${track}:${step.id}`;
    if (!data.canEdit || !selected || pendingKeys.has(key)) return;
    setError(null);
    const snapshot = data;
    const nowIso = new Date().toISOString();
    applyOptimistic(track, step, (s) =>
      transition === "start"
        ? { ...s, status: "in_progress", startedAt: nowIso }
        : transition === "end"
          ? {
              ...s,
              status: "completed",
              endedAt: nowIso,
              completedAt: nowIso,
            }
          : {
              ...s,
              status: "pending",
              startedAt: null,
              startedBy: null,
              startedByName: null,
              endedAt: null,
              endedBy: null,
              endedByName: null,
              completedAt: null,
              completedBy: null,
              completedByName: null,
              workDate: null,
              note: null,
            }
    );
    markPending(key, true);
    startTransition(async () => {
      const action =
        transition === "start"
          ? startProgressionStep
          : transition === "end"
            ? endProgressionStep
            : resetProgressionStep;
      const result = await action({
        projectId: data.projectId,
        floorId: selected.floorId,
        track,
        stepId: step.id,
        ...selectionsFor(track, selected.floorId),
      });
      markPending(key, false);
      if (!result.ok) {
        setData(snapshot);
        setError(result.error);
        return;
      }
      if (result.step) reconcileStep(track, result.step);
    });
  }

  function onSaveDates(
    track: ProgressionTrack,
    step: ProgressionStepView,
    startedAt: string | null,
    endedAt: string | null
  ) {
    const selected = data.selectedByTrack[track];
    const key = `${track}:${step.id}`;
    if (!data.canEdit || !selected || pendingKeys.has(key)) return;
    setError(null);
    const snapshot = data;
    applyOptimistic(track, step, (s) => ({
      ...s,
      startedAt,
      endedAt,
      completedAt: s.status === "completed" ? endedAt : s.completedAt,
    }));
    markPending(key, true);
    startTransition(async () => {
      const result = await updateProgressionStepDates({
        projectId: data.projectId,
        floorId: selected.floorId,
        track,
        stepId: step.id,
        startedAt,
        endedAt,
        ...selectionsFor(track, selected.floorId),
      });
      markPending(key, false);
      if (!result.ok) {
        setData(snapshot);
        setError(result.error);
        return;
      }
      if (result.step) reconcileStep(track, result.step);
    });
  }

  function onSaveSchedule(
    track: ProgressionTrack,
    plannedStartDate: string | null,
    plannedEndDate: string | null
  ) {
    const selected = data.selectedByTrack[track];
    const key = `${track}:schedule`;
    if (!data.canEdit || !selected || pendingKeys.has(key)) return;
    setError(null);
    const snapshot = data;
    setData((prev) => {
      const current = prev.selectedByTrack[track];
      if (!current) return prev;
      const updated = { ...current, plannedStartDate, plannedEndDate };
      const selectedByTrack = { ...prev.selectedByTrack, [track]: updated };
      return {
        ...prev,
        selectedByTrack,
        selected: selectedByTrack.post_slab,
      };
    });
    markPending(key, true);
    startTransition(async () => {
      const result = await setProgressionSchedule({
        projectId: data.projectId,
        floorId: selected.floorId,
        track,
        plannedStartDate,
        plannedEndDate,
        ...selectionsFor(track, selected.floorId),
      });
      markPending(key, false);
      if (!result.ok) {
        setData(snapshot);
        setError(result.error);
      }
    });
  }

  function openFullTab(floorId?: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "progression");
    if (floorId) {
      params.set("preFloor", floorId);
      params.set("postFloor", floorId);
      lockedRef.current = { pre: floorId, post: floorId };
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (compact && !summaryOnly) {
    return (
      <CheckProgressionReportCta
        overallPercent={data.overallPercent}
        activatedFloorCount={data.activatedFloorCount}
        floorCount={data.floorCount}
      />
    );
  }

  if (summaryOnly) {
    const activatedFloors = data.combinedFloors.filter((f) => f.activated);
    const projectCompleted = activatedFloors.reduce((s, f) => s + f.completedCount, 0);
    const projectTotal = activatedFloors.reduce((s, f) => s + f.totalCount, 0);

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Progression Report
            </p>
            <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-900 dark:text-white">
              Overview
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Overall project{" "}
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {data.overallPercent}%
              </span>
              {" · "}
              {data.activatedFloorCount}/{data.floorCount} floors activated
            </p>
          </div>
          <button
            type="button"
            onClick={() => openFullTab(selectedPost?.floorId)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Check Progression Report
          </button>
        </div>

        {data.combinedFloors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
            Add buildings and floors in admin to start monitoring.
          </p>
        ) : (
          <>
            <ProgressionOverallCard
              percent={data.overallPercent}
              completed={projectCompleted}
              total={projectTotal}
              label="Overall project"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {data.tracks.map((t) => (
                <div
                  key={t.track}
                  className={cn(
                    "rounded-2xl border bg-white p-4 dark:bg-slate-900/60",
                    TRACK_THEMES[t.track].section
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                        TRACK_THEMES[t.track].chip
                      )}
                    >
                      {PROGRESSION_TRACK_LABELS[t.track]}
                    </span>
                    <span className="font-display text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {t.percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        TRACK_THEMES[t.track].progress
                      )}
                      style={{ width: `${t.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-slate-500">
                    {t.completedCount}/{t.totalCount} ended
                    {t.inProgressCount > 0 ? ` · ${t.inProgressCount} in progress` : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                By floor
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.combinedFloors.map((floor) => (
                  <button
                    key={floor.floorId}
                    type="button"
                    onClick={() => openFullTab(floor.floorId)}
                    className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <span className="block text-xs font-medium leading-tight text-slate-700 dark:text-slate-200">
                      {floor.buildingName} · {floor.floorName}
                    </span>
                    <span className="block text-[10px] tabular-nums leading-tight text-slate-400">
                      {floor.activated ? `${floor.percent}%` : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPost ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <ProgressionOverallCard
                  percent={selectedPost.overallPercent}
                  completed={selectedPost.completedCount}
                  total={selectedPost.totalCount}
                  label={`${selectedPost.floorName} · Post-Slab`}
                />
                <ProgressionPhaseBars phases={selectedPost.phases} />
                <ProgressionDailyChart daily={selectedPost.daily} />
                <ProgressionWeeklyChart weekly={selectedPost.weekly} />
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  // Checklist tab (also default): Pre-Slab + Post-Slab sections.
  void checklistOnly;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Progression Report
          </h3>
          <p className="text-sm text-slate-500">
            Overall project{" "}
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {data.overallPercent}%
            </span>
            {" · "}
            {data.activatedFloorCount}/{data.floorCount} floors activated
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Track legend">
            {PROGRESSION_TRACKS.map((t) => {
              const summary = data.tracks.find((x) => x.track === t);
              return (
                <span
                  key={t}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                    TRACK_THEMES[t].chip
                  )}
                >
                  {PROGRESSION_TRACK_LABELS[t]} · {summary?.percent ?? 0}%
                </span>
              );
            })}
          </div>
        </div>
        {!data.canEdit ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
            View only — Client Admin, Site Engineer, Site Supervisor, and BuildView staff can
            start and end steps.
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      ) : null}

      {data.combinedFloors.length === 0 ? (
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
        <div className="space-y-5">
          {PROGRESSION_TRACKS.map((track) => (
            <TrackSection
              key={track}
              track={track}
              data={data}
              switching={switchingTrack === track}
              pendingKeys={pendingKeys}
              onSelectFloor={selectFloor}
              onTransition={onTransition}
              onSaveDates={onSaveDates}
              onSaveSchedule={onSaveSchedule}
            />
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Building2 className="h-3.5 w-3.5" aria-hidden />
        Tower and floor selections are independent for Pre-Slab and Post-Slab. Start and End
        presses are recorded in the project Timeline.
      </p>
    </div>
  );
}
