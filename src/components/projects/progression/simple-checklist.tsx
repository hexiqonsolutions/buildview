"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  checklistStepAction,
  getChecklist,
  getChecklistOverview,
  getStepPhotos,
  setChecklistStepNa,
  setChecklistEvidence,
  setChecklistSchedule,
  updateChecklistStep,
  verifyChecklistStep,
  type ChecklistList,
  type ChecklistScan,
  type ChecklistOverview,
  type ChecklistScope,
  type ChecklistStep,
  type ChecklistView,
  type StepPhoto,
} from "@/lib/actions/checklist";
import { uploadStepPhoto } from "@/lib/progression/photo-upload";
import { EditStepsDialog } from "@/components/projects/progression/edit-steps-dialog";
import { cn, formatDate } from "@/lib/utils";

type Tab = "inside" | "outside" | "site";
type PendingAction = { step: ChecklistStep; action: "start" | "done" };

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

function ago(iso: string | null): string {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return formatDate(iso);
}

/**
 * Progression v2, the simple screen: pick a floor (Inside), a building
 * (Outside) or Site works; one big button per step (Start → Done), optional
 * photo on each, everything else in the ⋯ menu.
 */
export function SimpleChecklist({ projectId, onChanged }: { projectId: string; onChanged?: () => void }) {
  const [overview, setOverview] = useState<ChecklistOverview | null>(null);
  const [tab, setTab] = useState<Tab>("inside");
  const [floorId, setFloorId] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [view, setView] = useState<ChecklistView | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [photosFor, setPhotosFor] = useState<ChecklistStep | null>(null);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [planning, setPlanning] = useState<ChecklistList | null>(null);

  const scope: ChecklistScope | null = useMemo(() => {
    if (tab === "site") return { kind: "site" };
    if (tab === "outside") return buildingId ? { kind: "building", buildingId } : null;
    return floorId ? { kind: "floor", floorId } : null;
  }, [tab, floorId, buildingId]);

  const loadOverview = useCallback(async () => {
    const r = await getChecklistOverview(projectId);
    if (r.ok) {
      setOverview(r.data);
      setFloorId((cur) => cur ?? r.data.floors.find((f) => f.percent > 0 && f.percent < 100)?.id ?? r.data.floors[0]?.id ?? null);
      setBuildingId((cur) => cur ?? r.data.buildings[0]?.id ?? null);
    } else setToast({ kind: "error", text: r.error });
  }, [projectId]);

  const loadList = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    const r = await getChecklist({ projectId, scope });
    setLoading(false);
    if (!r.ok) {
      setToast({ kind: "error", text: r.error });
      return;
    }
    setView(r.data);
    // Open the phase that holds the next step.
    const nextPhase = r.data.phases.find((p) => p.steps.some((s) => s.id === r.data.nextStepId));
    setOpen(new Set(nextPhase ? [nextPhase.key] : []));
  }, [projectId, scope]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(async () => {
    await Promise.all([loadList(), loadOverview()]);
    onChanged?.();
  }, [loadList, loadOverview, onChanged]);

  async function runAction(step: ChecklistStep, action: "start" | "done" | "undo", photo?: File | null) {
    setBusy(step.id);
    const r = await checklistStepAction({ projectId, stepId: step.id, action });
    if (!r.ok) {
      setBusy(null);
      setToast({ kind: "error", text: r.error });
      return;
    }
    setToast({ kind: "ok", text: `${action === "start" ? "Started" : action === "done" ? "Done" : "Undone"}: ${step.title}${photo ? " · photo uploading…" : ""}` });
    await refresh();
    setBusy(null);
    if (photo && action !== "undo") {
      try {
        await uploadStepPhoto(projectId, step.id, action === "start" ? "start" : "end", photo);
        setToast({ kind: "ok", text: `Photo saved: ${step.title}` });
        await loadList();
      } catch (err) {
        setToast({ kind: "error", text: err instanceof Error ? err.message : "Photo upload failed." });
      }
    }
  }

  async function toggleNa(step: ChecklistStep) {
    setBusy(step.id);
    const r = await setChecklistStepNa({ projectId, stepId: step.id, na: !step.na });
    setBusy(null);
    if (!r.ok) setToast({ kind: "error", text: r.error });
    else await refresh();
  }

  if (!overview) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-label="Loading checklist" />;
  }

  const floor = overview.floors.find((f) => f.id === floorId);
  const building = overview.buildings.find((b) => b.id === buildingId);
  const placeLabel = tab === "inside" ? (floor?.label ?? "Pick a floor") : tab === "outside" ? `${building?.name ?? "Pick a building"} · Outside` : "Site works";
  const allSteps = view?.phases.flatMap((p) => p.steps) ?? [];
  const next = allSteps.find((s) => s.id === view?.nextStepId) ?? null;
  const canEdit = overview.canEdit;

  return (
    <section aria-label="Checklist" className="mx-auto max-w-2xl space-y-3">
      {/* Header: where you are + % */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => tab !== "site" && setPicker(true)}
            className="flex min-h-11 min-w-0 items-center gap-1.5 text-left"
            aria-haspopup={tab !== "site" ? "dialog" : undefined}
          >
            <span className="truncate font-display text-lg font-semibold text-slate-900 dark:text-white">{placeLabel}</span>
            {tab !== "site" ? <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden /> : null}
          </button>
          <span className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{pct(view?.percent ?? 0)}</span>
        </div>
        <div role="tablist" aria-label="Checklist part" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              ["inside", "Inside", overview.parts.inside],
              ["outside", "Outside", overview.parts.outside],
              ["site", "Site", overview.parts.site],
            ] as const
          ).map(([key, label, value]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "min-h-11 rounded-lg px-2 text-sm font-medium transition-colors",
                tab === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"
              )}
            >
              {label} <span className="tabular-nums text-slate-500">{pct(value)}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Project {pct(overview.percent)} = Inside {overview.split.inside}% · Outside {overview.split.outside}% · Site {overview.split.site}%
          </p>
          {overview.canManage && view && view.lists.length > 0 ? (
            <button type="button" onClick={() => setEditing(true)} className="min-h-9 rounded-md px-2 text-sm font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200">
              Edit steps
            </button>
          ) : null}
        </div>
      </div>

      {view && view.lists.length > 0 ? <ListsCard lists={view.lists} canEdit={canEdit} onPlan={setPlanning} /> : null}

      {/* Next up */}
      {next && canEdit ? (
        <div className="rounded-2xl border-2 border-[#4d7c0f]/30 bg-[#4d7c0f]/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3f5d12] dark:text-lime-300">Next up</p>
          <p className="mt-1 text-base font-medium text-slate-900 dark:text-white">{next.title}</p>
          {next.status === "in_progress" ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Started {ago(next.startedAt)}
              {next.startedBy ? ` · ${next.startedBy}` : ""}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-3 h-12 w-full bg-[#4d7c0f] text-base text-white hover:bg-[#3f6a0c]"
            disabled={busy === next.id}
            onClick={() => setPending({ step: next, action: next.status === "in_progress" ? "done" : "start" })}
          >
            {busy === next.id ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
            {next.status === "in_progress" ? "Mark done" : "Start"}
          </Button>
        </div>
      ) : null}

      {/* Filter */}
      {view && view.phases.length > 0 ? (
        <div role="radiogroup" aria-label="Show steps" className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-sm font-medium",
                filter === f.key ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Phases */}
      {loading && !view ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
        </div>
      ) : !view || view.phases.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          No checklist here yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {view.phases.map((phase) => {
            const shown = phase.steps.filter((s) => matchesFilter(s, filter));
            if (filter !== "all" && shown.length === 0) return null;
            const isOpen = filter !== "all" || open.has(phase.key);
            const done = phase.percent != null && phase.percent >= 100;
            return (
              <li key={phase.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpen((prev) => {
                      const n = new Set(prev);
                      if (n.has(phase.key)) n.delete(phase.key);
                      else n.add(phase.key);
                      return n;
                    })
                  }
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {done ? (
                    <Check className="h-5 w-5 shrink-0 text-[#4d7c0f]" aria-label="Complete" />
                  ) : (phase.percent ?? 0) > 0 ? (
                    <CircleDot className="h-5 w-5 shrink-0 text-amber-600" aria-label="In progress" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-slate-400" aria-label="Not started" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900 dark:text-white">{phase.name}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="block h-full rounded-full bg-[#4d7c0f]" style={{ width: `${Math.min(100, phase.percent ?? 0)}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-slate-300">{pct(phase.percent)}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden /> : <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />}
                </button>
                {isOpen ? (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                    {shown.map((step) => (
                      <StepRow
                        key={step.id}
                        projectId={projectId}
                        step={step}
                        scans={view.scans}
                        canEdit={canEdit}
                        canVerify={overview.canVerify}
                        busy={busy === step.id}
                        expanded={expanded === step.id}
                        onToggle={() => setExpanded((cur) => (cur === step.id ? null : step.id))}
                        onPrimary={() => setPending({ step, action: step.status === "in_progress" ? "done" : "start" })}
                        onUndo={() => runAction(step, "undo")}
                        onNa={() => toggleNa(step)}
                        onPhotos={() => setPhotosFor(step)}
                        onChanged={() => void refresh()}
                        onToast={setToast}
                      />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {toast ? (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={cn(
            "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-lg",
            toast.kind === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          )}
        >
          {toast.text}
        </div>
      ) : null}

      <PhotoSheet
        pending={pending}
        onClose={() => setPending(null)}
        onConfirm={(photo) => {
          const p = pending;
          setPending(null);
          if (p) void runAction(p.step, p.action, photo);
        }}
      />
      <PhotosDialog projectId={projectId} step={photosFor} onClose={() => setPhotosFor(null)} onAdded={loadList} canEdit={canEdit} />
      {view ? (
        <EditStepsDialog
          projectId={projectId}
          lists={view.lists}
          open={editing}
          onOpenChange={setEditing}
          onSaved={(text) => {
            setToast({ kind: "ok", text });
            void refresh();
          }}
        />
      ) : null}
      <ScheduleDialog projectId={projectId} list={planning} onClose={() => setPlanning(null)} onSaved={() => void refresh()} />
      <PlacePicker
        open={picker}
        tab={tab}
        overview={overview}
        onClose={() => setPicker(false)}
        onPick={(id) => {
          if (tab === "outside") setBuildingId(id);
          else setFloorId(id);
          setPicker(false);
        }}
      />
    </section>
  );
}

type Filter = "all" | "todo" | "doing" | "done" | "review";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "doing", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "review", label: "Needs review" },
];

function matchesFilter(step: ChecklistStep, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "todo") return step.status === "pending" && !step.na;
  if (f === "doing") return step.status === "in_progress";
  if (f === "done") return step.status === "completed";
  return step.status === "completed" && step.verification !== "verified";
}

function scheduleStatusLabel(actual: number | null, planned: number | null): { text: string; tone: string } | null {
  if (planned == null || actual == null) return null;
  if (actual >= 100) return { text: "Complete", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" };
  if (actual >= planned) return { text: "On track", tone: "bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-100" };
  const behind = planned > 0 ? ((planned - actual) / planned) * 100 : 0;
  return behind < 20
    ? { text: `Behind ${Math.round(planned - actual)} pts`, tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" }
    : { text: `Behind ${Math.round(planned - actual)} pts`, tone: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100" };
}

/** Each list here (Structure / Finishing, Outside, Site): actual vs planned and its dates. */
function ListsCard({ lists, canEdit, onPlan }: { lists: ChecklistList[]; canEdit: boolean; onPlan: (list: ChecklistList) => void }) {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {lists.map((l) => {
        const status = scheduleStatusLabel(l.percent, l.plannedPercent);
        return (
          <div key={l.progressionId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{l.name}</p>
              <p className="text-xs text-slate-500">
                {l.plannedStart && l.plannedEnd ? `Plan ${formatDate(l.plannedStart)} – ${formatDate(l.plannedEnd)}` : "No planned dates"}
                {l.plannedPercent != null ? ` · planned ${Math.round(l.plannedPercent)}% today` : ""}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{pct(l.percent)}</span>
            {status ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.tone)}>{status.text}</span> : null}
            {canEdit ? (
              <button type="button" onClick={() => onPlan(l)} className="min-h-9 rounded-md px-2 text-sm font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-200">
                Plan dates
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleDialog({ projectId, list, onClose, onSaved }: { projectId: string; list: ChecklistList | null; onClose: () => void; onSaved: () => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setStart(list?.plannedStart ?? "");
    setEnd(list?.plannedEnd ?? "");
    setError(null);
  }, [list]);
  async function save() {
    if (!list) return;
    setSaving(true);
    const r = await setChecklistSchedule({ projectId, progressionId: list.progressionId, start: start || null, end: end || null });
    setSaving(false);
    if (!r.ok) setError(r.error);
    else {
      onClose();
      onSaved();
    }
  }
  return (
    <Dialog open={Boolean(list)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Plan dates</DialogTitle>
          <DialogDescription>{list?.name}: planned % rises evenly from the start to the end date.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Start</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-base" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Finish</span>
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-base" />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({
  projectId,
  step,
  scans,
  canEdit,
  canVerify,
  busy,
  expanded,
  onToggle,
  onPrimary,
  onUndo,
  onNa,
  onPhotos,
  onChanged,
  onToast,
}: {
  projectId: string;
  step: ChecklistStep;
  scans: ChecklistScan[];
  canEdit: boolean;
  canVerify: boolean;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPrimary: () => void;
  onUndo: () => void;
  onNa: () => void;
  onPhotos: () => void;
  onChanged: () => void;
  onToast: (t: { kind: "ok" | "error"; text: string }) => void;
}) {
  const photos = step.photos.start + step.photos.end;
  const meta =
    step.na
      ? "Not applicable here"
      : step.status === "completed"
        ? `Done ${step.workDate ? formatDate(step.workDate) : ago(step.endedAt)}${step.endedBy ? ` · ${step.endedBy}` : ""}`
        : step.status === "in_progress"
          ? `Started ${ago(step.startedAt)}${step.startedBy ? ` · ${step.startedBy}` : ""}`
          : step.photoExpected
            ? "Photo recommended"
            : "";
  return (
    <li className={cn(step.na && "opacity-60")}>
      <div className="flex items-center gap-3 px-4 py-3">
        {step.status === "completed" ? (
          <Check className="h-5 w-5 shrink-0 text-[#4d7c0f]" aria-label="Done" />
        ) : step.status === "in_progress" ? (
          <CircleDot className="h-5 w-5 shrink-0 text-amber-600" aria-label="In progress" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="Not started" />
        )}
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="min-w-0 flex-1 text-left">
          <span className={cn("block text-[15px] text-slate-900 dark:text-white", step.na && "line-through")}>{step.title}</span>
          {meta || photos || step.verification || step.note || step.evidence ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              {meta ? <span>{meta}</span> : null}
              {photos ? (
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden /> {photos}
                </span>
              ) : null}
              {step.evidence ? <span>360 linked</span> : null}
              {step.note ? <span>Note</span> : null}
              {step.verification === "verified" ? <span className="text-emerald-700 dark:text-emerald-400">Verified</span> : null}
              {step.verification === "rejected" ? <span className="text-red-700 dark:text-red-400">Rejected</span> : null}
            </span>
          ) : null}
        </button>
        {canEdit && !step.na && step.status !== "completed" ? (
          <Button
            type="button"
            size="sm"
            onClick={onPrimary}
            disabled={busy}
            className={cn("h-11 min-w-[88px] text-sm", step.status === "in_progress" ? "bg-[#4d7c0f] text-white hover:bg-[#3f6a0c]" : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900")}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {step.status === "in_progress" ? "Done" : "Start"}
          </Button>
        ) : null}
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`More for ${step.title}`} className="inline-flex h-11 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onToggle}>{expanded ? "Hide details" : "Details"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onPhotos}>Photos</DropdownMenuItem>
              {step.status !== "pending" ? <DropdownMenuItem onSelect={onUndo}>Undo last change</DropdownMenuItem> : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onNa}>{step.na ? "Mark as applicable" : "Not applicable here"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {expanded ? (
        <StepDetails projectId={projectId} step={step} scans={scans} canEdit={canEdit} canVerify={canVerify} onPhotos={onPhotos} onChanged={onChanged} onToast={onToast} />
      ) : null}
    </li>
  );
}

function StepDetails({
  projectId,
  step,
  scans,
  canEdit,
  canVerify,
  onPhotos,
  onChanged,
  onToast,
}: {
  projectId: string;
  step: ChecklistStep;
  scans: ChecklistScan[];
  canEdit: boolean;
  canVerify: boolean;
  onPhotos: () => void;
  onChanged: () => void;
  onToast: (t: { kind: "ok" | "error"; text: string }) => void;
}) {
  const [note, setNote] = useState(step.note ?? "");
  const [workDate, setWorkDate] = useState(step.workDate ?? "");
  const [reviewNote, setReviewNote] = useState("");
  const [thumbs, setThumbs] = useState<StepPhoto[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (step.photos.start + step.photos.end === 0) {
      setThumbs([]);
      return;
    }
    getStepPhotos({ projectId, stepId: step.id }).then((r) => {
      if (!cancelled) setThumbs(r.ok ? r.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, step.id, step.photos.start, step.photos.end]);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setSaving(key);
    const r = await fn();
    setSaving(null);
    if (!r.ok) onToast({ kind: "error", text: r.error ?? "Could not save." });
    else {
      onToast({ kind: "ok", text: okText });
      onChanged();
    }
  }

  const row = "grid gap-1 text-sm sm:grid-cols-[8.5rem_1fr] sm:items-center";
  const lbl = "text-xs font-medium uppercase tracking-wide text-slate-500";
  return (
    <div className="space-y-3 bg-slate-50 px-4 pb-4 pt-3 text-sm dark:bg-slate-950/50">
      <div className={row}>
        <span className={lbl}>Started</span>
        <span className="text-slate-800 dark:text-slate-200">{step.startedAt ? `${formatDate(step.startedAt)}${step.startedBy ? ` · ${step.startedBy}` : ""}` : "—"}</span>
      </div>
      <div className={row}>
        <span className={lbl}>Done</span>
        <span className="text-slate-800 dark:text-slate-200">{step.endedAt ? `${formatDate(step.endedAt)}${step.endedBy ? ` · ${step.endedBy}` : ""}` : "—"}</span>
      </div>
      {step.status !== "pending" ? (
        <div className={row}>
          <span className={lbl}>Work date</span>
          {canEdit ? (
            <span className="flex flex-wrap items-center gap-2">
              <input type="date" value={workDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setWorkDate(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-2 text-base" aria-label="Work date" />
              {workDate !== (step.workDate ?? "") ? (
                <Button type="button" size="sm" variant="outline" disabled={saving === "date"} onClick={() => run("date", () => updateChecklistStep({ projectId, stepId: step.id, workDate: workDate || null }), "Date saved")}>
                  Save date
                </Button>
              ) : null}
            </span>
          ) : (
            <span>{step.workDate ? formatDate(step.workDate) : "—"}</span>
          )}
        </div>
      ) : null}
      <div className={row}>
        <span className={lbl}>Photos</span>
        <span className="flex flex-wrap items-center gap-2">
          {thumbs === null ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
          ) : (
            thumbs.slice(0, 4).map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.kind === "start" ? "At start" : "When done"} className="h-14 w-14 object-cover" loading="lazy" />
              </a>
            ))
          )}
          <Button type="button" size="sm" variant="outline" onClick={onPhotos}>
            <Camera aria-hidden /> {thumbs && thumbs.length > 0 ? "All photos" : "Add photo"}
          </Button>
        </span>
      </div>
      <div className={row}>
        <span className={lbl}>360 evidence</span>
        {canEdit ? (
          <span className="flex flex-wrap items-center gap-2">
            <select
              aria-label="360 scan as evidence"
              value={step.evidence?.id ?? ""}
              onChange={(e) => run("evidence", () => setChecklistEvidence({ projectId, stepId: step.id, tourId: e.target.value || null }), e.target.value ? "Scan linked" : "Scan removed")}
              className="h-10 max-w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">{scans.length ? "No scan linked" : "No scans for this place yet"}</option>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.date ? ` · ${formatDate(s.date)}` : ""}
                </option>
              ))}
            </select>
            {step.evidence ? (
              <a href={step.evidence.url} target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-2">
                Open scan
              </a>
            ) : null}
          </span>
        ) : step.evidence ? (
          <a href={step.evidence.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {step.evidence.name}
          </a>
        ) : (
          <span>—</span>
        )}
      </div>
      <div className={row}>
        <span className={lbl}>Note</span>
        {canEdit ? (
          <span className="grid gap-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. Flat 302 kitchen pending" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base" aria-label="Note" />
            {note !== (step.note ?? "") ? (
              <Button type="button" size="sm" variant="outline" className="justify-self-start" disabled={saving === "note"} onClick={() => run("note", () => updateChecklistStep({ projectId, stepId: step.id, note: note || null }), "Note saved")}>
                Save note
              </Button>
            ) : null}
          </span>
        ) : (
          <span>{step.note || "—"}</span>
        )}
      </div>
      <div className={row}>
        <span className={lbl}>Review</span>
        <span className="grid gap-2">
          <span className="text-slate-800 dark:text-slate-200">
            {step.verification === "verified"
              ? `Verified${step.verifiedBy ? ` by ${step.verifiedBy}` : ""}`
              : step.verification === "rejected"
                ? `Rejected${step.verifiedBy ? ` by ${step.verifiedBy}` : ""}${step.verificationNote ? `: ${step.verificationNote}` : ""}`
                : step.status === "completed"
                  ? "Waiting for review"
                  : "Reviewed once done"}
          </span>
          {canVerify && step.status === "completed" ? (
            <span className="grid gap-2 sm:flex sm:items-center">
              <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} maxLength={500} placeholder="Note (needed to reject)" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base" aria-label="Review note" />
              <span className="flex gap-2">
                <Button type="button" size="sm" className="h-10 bg-[#4d7c0f] text-white hover:bg-[#3f6a0c]" disabled={saving === "verify"} onClick={() => run("verify", () => verifyChecklistStep({ projectId, stepId: step.id, decision: "verified", note: reviewNote || null }), "Verified")}>
                  Verify
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-10" disabled={saving === "verify" || !reviewNote.trim()} onClick={() => run("verify", () => verifyChecklistStep({ projectId, stepId: step.id, decision: "rejected", note: reviewNote }), "Rejected; the team was told")}>
                  Reject
                </Button>
              </span>
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** Start / Done: take a photo, choose one, or skip. */
function PhotoSheet({ pending, onClose, onConfirm }: { pending: PendingAction | null; onClose: () => void; onConfirm: (photo: File | null) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (file) onConfirm(file);
  };
  return (
    <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{pending?.action === "done" ? "Mark done" : "Start"}: add a photo?</DialogTitle>
          <DialogDescription>
            {pending?.step.title}
            {pending?.step.photoExpected ? " · a photo is recommended for this step." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button type="button" className="h-14 bg-[#4d7c0f] text-base text-white hover:bg-[#3f6a0c]" onClick={() => cameraRef.current?.click()}>
            <Camera aria-hidden /> Take photo
          </Button>
          <Button type="button" variant="outline" className="h-12 text-base" onClick={() => galleryRef.current?.click()}>
            <ImageIcon aria-hidden /> Choose from gallery
          </Button>
          <Button type="button" variant="ghost" className="h-12 text-base" onClick={() => onConfirm(null)}>
            {pending?.action === "done" ? "Mark done without photo" : "Start without photo"}
          </Button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={pick} />
        <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={pick} />
      </DialogContent>
    </Dialog>
  );
}

function PhotosDialog({
  projectId,
  step,
  onClose,
  onAdded,
  canEdit,
}: {
  projectId: string;
  step: ChecklistStep | null;
  onClose: () => void;
  onAdded: () => void;
  canEdit: boolean;
}) {
  const [photos, setPhotos] = useState<StepPhoto[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setPhotos(null);
    setError(null);
    getStepPhotos({ projectId, stepId: step.id }).then((r) => {
      if (!cancelled) {
        if (r.ok) setPhotos(r.data);
        else setError(r.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, step]);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !step) return;
    setUploading(true);
    setError(null);
    try {
      await uploadStepPhoto(projectId, step.id, step.status === "completed" ? "end" : step.status === "in_progress" ? "start" : "other", file);
      const r = await getStepPhotos({ projectId, stepId: step.id });
      if (r.ok) setPhotos(r.data);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const label = (k: StepPhoto["kind"]) => (k === "start" ? "At start" : k === "end" ? "When done" : "Photo");
  return (
    <Dialog open={Boolean(step)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Photos</DialogTitle>
          <DialogDescription>{step?.title}</DialogDescription>
        </DialogHeader>
        {!photos ? (
          error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
            </div>
          )
        ) : photos.length === 0 ? (
          <p className="text-sm text-slate-500">No photos yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${label(p.kind)}: ${step?.title ?? ""}`} className="aspect-square w-full object-cover" loading="lazy" />
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  {label(p.kind)} · {formatDate(p.createdAt)}
                  {p.by ? ` · ${p.by}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {error && photos ? <p className="text-sm text-red-600">{error}</p> : null}
        {canEdit ? (
          <>
            <Button type="button" variant="outline" className="h-12" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />} Add photo
            </Button>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={add} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PlacePicker({
  open,
  tab,
  overview,
  onClose,
  onPick,
}: {
  open: boolean;
  tab: Tab;
  overview: ChecklistOverview;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const items =
    tab === "outside"
      ? overview.buildings.map((b) => ({ id: b.id, label: b.name, group: "Buildings", percent: b.percent }))
      : overview.floors.map((f) => ({ id: f.id, label: f.label, group: f.buildingName, percent: f.percent }));
  const shown = items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tab === "outside" ? "Choose a building" : "Choose a floor"}</DialogTitle>
        </DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-base"
          />
        </label>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {shown.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => onPick(i.id)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1 truncate text-[15px] text-slate-900 dark:text-white">{i.label}</span>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="block h-full rounded-full bg-[#4d7c0f]" style={{ width: `${Math.min(100, i.percent)}%` }} />
                </span>
                <span className="w-10 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">{Math.round(i.percent)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
