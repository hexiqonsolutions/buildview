"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, HardHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConstructionMethods,
  setConstructionMethod,
  type ConstructionMethodView,
} from "@/lib/actions/construction-method";
import {
  CONSTRUCTION_METHODS,
  CONSTRUCTION_METHOD_HINTS,
  CONSTRUCTION_METHOD_LABELS,
  effectiveMethod,
  type ConstructionMethod,
} from "@/lib/progression/methods";
import { cn } from "@/lib/utils";

type Target = { kind: "project" } | { kind: "building"; id: string } | { kind: "floor"; id: string };
type Pending = { target: Target; method: ConstructionMethod | null; label: string; startedFloors: string[] };

const INHERIT = "__inherit";

/** Method chip that opens the construction-method settings. */
export function ConstructionMethodControl({
  projectId,
  methodsInUse,
  onChanged,
}: {
  projectId: string;
  methodsInUse: ConstructionMethod[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const summary =
    methodsInUse.length > 1
      ? `Mixed · ${methodsInUse.map((m) => CONSTRUCTION_METHOD_LABELS[m]).join(", ")}`
      : CONSTRUCTION_METHOD_LABELS[methodsInUse[0] ?? "conventional"];
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <HardHat className="mr-1.5 h-4 w-4" aria-hidden />
        <span className="text-slate-500">Method:</span> {summary}
      </Button>
      <ConstructionMethodDialog projectId={projectId} open={open} onOpenChange={setOpen} onChanged={onChanged} />
    </>
  );
}

export function ConstructionMethodDialog({
  projectId,
  open,
  onOpenChange,
  onChanged,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [view, setView] = useState<ConstructionMethodView | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setNotice(null);
    setPending(null);
    getConstructionMethods(projectId).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const ready = view && view.available ? view : null;

  /** Floors whose method would change, and which of those have started work. */
  function impact(target: Target, method: ConstructionMethod | null): { changed: number; started: string[] } {
    if (!ready) return { changed: 0, started: [] };
    let changed = 0;
    const started: string[] = [];
    for (const b of ready.buildings) {
      for (const f of b.floors) {
        const projectM = target.kind === "project" && method ? method : ready.project;
        const buildingOwn = target.kind === "building" && target.id === b.id ? method : b.own;
        const floorOwn = target.kind === "floor" && target.id === f.id ? method : f.own;
        const next = effectiveMethod(floorOwn, buildingOwn, projectM);
        if (next !== f.effective) {
          changed += 1;
          if (f.started) started.push(`${b.name} · ${f.name}`);
        }
      }
    }
    return { changed, started };
  }

  function request(target: Target, method: ConstructionMethod | null, label: string) {
    const { changed, started } = impact(target, method);
    if (changed === 0) {
      apply({ target, method, label, startedFloors: [] });
      return;
    }
    if (started.length > 0) setPending({ target, method, label, startedFloors: started });
    else apply({ target, method, label, startedFloors: [] });
  }

  function apply(change: Pending) {
    setError(null);
    setNotice(null);
    setPending(null);
    startTransition(async () => {
      const result = await setConstructionMethod({ projectId, target: change.target, method: change.method });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView(result.view);
      setNotice(
        result.switched > 0
          ? `${change.label}: ${result.switched} checklist${result.switched === 1 ? "" : "s"} moved to the new method` +
              (result.carried > 0 ? `, ${result.carried} recorded step${result.carried === 1 ? "" : "s"} kept` : "") +
              (result.dropped > 0 ? `, ${result.dropped} archived (no match in the new checklist)` : "") +
              "."
          : `${change.label} saved.`
      );
      onChanged();
    });
  }

  const totalFloors = useMemo(() => ready?.buildings.reduce((n, b) => n + b.floors.length, 0) ?? 0, [ready]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Construction method</DialogTitle>
          <DialogDescription>
            The method decides each floor&apos;s checklist. Set the project default, then override a building
            or a single floor (e.g. a conventional podium under Mivan typical floors).
          </DialogDescription>
        </DialogHeader>

        {!view ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
          </div>
        ) : !ready ? (
          <p className="text-sm text-slate-500">{view.available ? null : view.reason}</p>
        ) : (
          <div className="space-y-5">
            {/* Project default */}
            <section aria-labelledby="cm-project" className="space-y-2">
              <h4 id="cm-project" className="text-sm font-semibold text-slate-900 dark:text-white">
                Project default
              </h4>
              <div role="radiogroup" aria-label="Project default method" className="grid gap-2 sm:grid-cols-3">
                {CONSTRUCTION_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={ready.project === m}
                    disabled={!ready.canEdit || saving}
                    onClick={() => ready.project !== m && request({ kind: "project" }, m, "Project default")}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
                      ready.project === m
                        ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-900"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    )}
                  >
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {CONSTRUCTION_METHOD_LABELS[m]}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{CONSTRUCTION_METHOD_HINTS[m]}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Buildings and floors */}
            <section aria-labelledby="cm-buildings" className="space-y-2">
              <h4 id="cm-buildings" className="text-sm font-semibold text-slate-900 dark:text-white">
                Buildings and floors{" "}
                <span className="font-normal text-slate-500">· {totalFloors} floors</span>
              </h4>
              {ready.buildings.length === 0 ? (
                <p className="text-sm text-slate-500">No buildings yet. They follow the project default.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {ready.buildings.map((b) => {
                    const isOpen = expanded.has(b.id);
                    const buildingEffective = b.own ?? ready.project;
                    const overrides = b.floors.filter((f) => f.own).length;
                    return (
                      <li key={b.id}>
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(b.id)) next.delete(b.id);
                                else next.add(b.id);
                                return next;
                              })
                            }
                            aria-expanded={isOpen}
                            className="flex min-h-10 flex-1 items-center gap-1.5 text-left text-sm font-medium text-slate-900 dark:text-white"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                            {b.name}
                            <span className="text-xs font-normal text-slate-500">
                              · {b.floors.length} floors{overrides > 0 ? ` · ${overrides} overridden` : ""}
                            </span>
                          </button>
                          <MethodSelect
                            label={`${b.name} method`}
                            value={b.own}
                            inheritLabel={`Same as project (${CONSTRUCTION_METHOD_LABELS[ready.project]})`}
                            disabled={!ready.canEdit || saving}
                            onChange={(m) => request({ kind: "building", id: b.id }, m, b.name)}
                          />
                        </div>
                        {isOpen ? (
                          <ul className="space-y-1 bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                            {b.floors.map((f) => (
                              <li key={f.id} className="flex flex-wrap items-center gap-2 pl-6">
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                                  {f.name}
                                  {f.started ? <span className="ml-1.5 text-xs text-slate-500">· work started</span> : null}
                                </span>
                                <MethodSelect
                                  label={`${b.name} ${f.name} method`}
                                  value={f.own}
                                  inheritLabel={`Same as building (${CONSTRUCTION_METHOD_LABELS[buildingEffective]})`}
                                  disabled={!ready.canEdit || saving}
                                  onChange={(m) => request({ kind: "floor", id: f.id }, m, `${b.name} · ${f.name}`)}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!ready.canEdit ? (
                <p className="text-xs text-slate-500">Only BuildView staff or the Client Admin can change methods.</p>
              ) : null}
            </section>

            {pending ? (
              <div role="alertdialog" aria-labelledby="cm-confirm" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <p id="cm-confirm" className="font-semibold">
                  Change {pending.label} to {pending.method ? CONSTRUCTION_METHOD_LABELS[pending.method] : "the inherited method"}?
                </p>
                <p>
                  Work has started on {pending.startedFloors.length} floor{pending.startedFloors.length === 1 ? "" : "s"} (
                  {pending.startedFloors.slice(0, 4).join(", ")}
                  {pending.startedFloors.length > 4 ? ` and ${pending.startedFloors.length - 4} more` : ""}). Their checklists
                  move to the new method: steps that exist in both keep their dates, evidence and verification; the
                  rest are archived with the old checklist (not deleted). Their % will change.
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => apply(pending)} disabled={saving}>
                    Change method
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {notice ? (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {saving ? (
            <span className="mr-auto flex items-center text-xs text-slate-500">
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> Updating checklists…
            </span>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodSelect({
  label,
  value,
  inheritLabel,
  disabled,
  onChange,
}: {
  label: string;
  value: ConstructionMethod | null;
  inheritLabel: string;
  disabled: boolean;
  onChange: (method: ConstructionMethod | null) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? INHERIT}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === INHERIT ? null : (e.target.value as ConstructionMethod))}
      className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
    >
      <option value={INHERIT}>{inheritLabel}</option>
      {CONSTRUCTION_METHODS.map((m) => (
        <option key={m} value={m}>
          {CONSTRUCTION_METHOD_LABELS[m]}
        </option>
      ))}
    </select>
  );
}
