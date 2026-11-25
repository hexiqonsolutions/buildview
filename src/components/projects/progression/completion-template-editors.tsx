"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CalendarRange, Download, Loader2, Plus, Settings2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDefaultTemplate,
  getZoneProgress,
  resetCompletionTemplate,
  saveActivityPlans,
  saveCompletionTemplate,
  type ZoneProgressView,
} from "@/lib/actions/zone-progress";
import {
  parsePlanCsv,
  plansToCsv,
  validateTemplate,
  type ActivityPlan,
} from "@/lib/progression/template";
import { cn } from "@/lib/utils";
import { CONSTRUCTION_METHOD_LABELS } from "@/lib/progression/methods";

type Ready = Extract<ZoneProgressView, { available: true }>;

const ZONE_TYPES: { value: string; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "unit", label: "Unit" },
  { value: "room", label: "Room" },
  { value: "common", label: "Common" },
  { value: "other", label: "Other" },
];

type TradeRow = { id: string; key: string | null; name: string; weight: string };
type StageRow = { id: string; key: string | null; name: string; credit: string };

let rowSeq = 0;
const rowId = () => `r${++rowSeq}`;

const toNumber = (v: string) => (v.trim() === "" ? NaN : Number(v));

// ------------------------------------------------------------ trades & stages

/**
 * Trades, weights, stages and default N/A rules (BuildView staff). Edits either
 * this project's own template or the BuildView defaults used by every project
 * without one. Keys survive renames so recorded updates keep matching.
 */
export function TemplateEditorDialog({
  view,
  open,
  onOpenChange,
  onSaved,
}: {
  view: Ready;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (view: ZoneProgressView) => void;
}) {
  const [scope, setScope] = useState<"project" | "default">("project");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [na, setNa] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(from: {
    activities: { key: string; name: string; weight: number }[];
    stages: { key: string; name: string; credit: number }[];
    naRules: { zoneType: string; activityKey: string }[];
  }) {
    const total = from.activities.reduce((s, a) => s + a.weight, 0) || 1;
    // Show weights as % of 100 even if stored weights don't sum to 100.
    setTrades(
      from.activities.map((a) => ({
        id: rowId(),
        key: a.key,
        name: a.name,
        weight: String(Math.round((a.weight / total) * 10000) / 100),
      }))
    );
    setStages(from.stages.map((s) => ({ id: rowId(), key: s.key, name: s.name, credit: String(s.credit) })));
    const nameByKey = new Map(from.activities.map((a) => [a.key, a.name.toLowerCase()]));
    setNa(
      new Set(
        from.naRules
          .map((r) => (nameByKey.has(r.activityKey) ? `${r.zoneType}|${r.activityKey}` : null))
          .filter((x): x is string => x != null)
      )
    );
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (scope === "project") {
      load({ activities: view.activities, stages: view.stages, naRules: view.naRules });
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDefaultTemplate(view.constructionMethod).then((t) => {
      if (cancelled) return;
      setLoading(false);
      if (!t) {
        setError("Could not load the BuildView defaults.");
        return;
      }
      load(t);
    });
    return () => {
      cancelled = true;
    };
  }, [open, scope, view]);

  const parsed = useMemo(
    () =>
      validateTemplate({
        activities: trades.map((t) => ({ key: t.key, name: t.name, weight: toNumber(t.weight) })),
        stages: stages.map((s) => ({ key: s.key, name: s.name, credit: toNumber(s.credit) })),
      }),
    [trades, stages]
  );
  const weightSum = trades.reduce((s, t) => s + (Number.isFinite(toNumber(t.weight)) ? toNumber(t.weight) : 0), 0);
  const sumOk = Math.abs(weightSum - 100) <= 0.01;

  function move<T>(list: T[], index: number, delta: number): T[] {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  /** N/A grid is keyed by trade key; new trades (no key yet) key by row id. */
  const naKey = (t: TradeRow) => t.key ?? t.id;

  function save() {
    if (!parsed.ok) return;
    const naRules = trades.flatMap((t) =>
      ZONE_TYPES.filter((z) => na.has(`${z.value}|${naKey(t)}`)).map((z) => ({
        zoneType: z.value as "flat" | "unit" | "room" | "common" | "other",
        activityName: t.name.trim(),
      }))
    );
    setError(null);
    startTransition(async () => {
      const result = await saveCompletionTemplate({
        projectId: scope === "project" ? view.projectId : null,
        method: scope === "default" ? view.constructionMethod : undefined,
        activities: trades.map((t) => ({ key: t.key, name: t.name.trim(), weight: toNumber(t.weight) })),
        stages: stages.map((s) => ({ key: s.key, name: s.name.trim(), credit: toNumber(s.credit) })),
        naRules,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(scope === "project" ? result.view : await getZoneProgress(view.projectId));
      onOpenChange(false);
    });
  }

  function resetToDefaults() {
    setError(null);
    startTransition(async () => {
      const result = await resetCompletionTemplate({ projectId: view.projectId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.view);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trades &amp; stages</DialogTitle>
          <DialogDescription>
            Trades and their weight decide how much each one counts toward a zone&apos;s %. Stages decide
            how much credit a trade earns as it moves along.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Which template" className="inline-flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
          {(
            [
              ["project", "This project"],
              ["default", `BuildView defaults · ${CONSTRUCTION_METHOD_LABELS[view.constructionMethod]}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              onClick={() => setScope(value)}
              className={cn(
                "min-h-9 rounded-md px-3 font-medium transition-colors",
                scope === value
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="-mt-1 text-xs text-slate-500">
          {scope === "project"
            ? view.templateSource === "project"
              ? "This project has its own template. Saving changes only this project."
              : "This project uses the BuildView defaults. Saving here gives it its own copy."
            : `Used by every ${CONSTRUCTION_METHOD_LABELS[view.constructionMethod]} project that doesn't have its own template.`}
        </p>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading defaults…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Trades */}
            <section aria-labelledby="tpl-trades" className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <h4 id="tpl-trades" className="text-sm font-semibold text-slate-900 dark:text-white">
                  Trades
                </h4>
                <p
                  aria-live="polite"
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    sumOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  )}
                >
                  Weights total {Math.round(weightSum * 100) / 100}% {sumOk ? "✓" : "· must be 100%"}
                </p>
              </div>
              <ul className="space-y-2">
                {trades.map((t, i) => (
                  <li key={t.id} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
                    <Input
                      aria-label={`Trade ${i + 1} name`}
                      value={t.name}
                      maxLength={60}
                      onChange={(e) => setTrades((rows) => rows.map((r) => (r.id === t.id ? { ...r, name: e.target.value } : r)))}
                    />
                    <div className="relative">
                      <Input
                        aria-label={`${t.name || "Trade"} weight`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={t.weight}
                        className="pr-7 tabular-nums"
                        onChange={(e) => setTrades((rows) => rows.map((r) => (r.id === t.id ? { ...r, weight: e.target.value } : r)))}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                    <RowActions
                      label={t.name || `trade ${i + 1}`}
                      onUp={i > 0 ? () => setTrades((rows) => move(rows, i, -1)) : undefined}
                      onDown={i < trades.length - 1 ? () => setTrades((rows) => move(rows, i, 1)) : undefined}
                      onRemove={trades.length > 1 ? () => setTrades((rows) => rows.filter((r) => r.id !== t.id)) : undefined}
                    />
                  </li>
                ))}
              </ul>
              {trades.length < 20 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTrades((rows) => [...rows, { id: rowId(), key: null, name: "", weight: "0" }])}
                >
                  <Plus /> Add trade
                </Button>
              ) : null}
              <p className="text-xs text-slate-500">
                Renaming keeps a trade&apos;s recorded updates. Removing a trade drops it from the %; its old
                updates stay in history.
              </p>
            </section>

            {/* Stages */}
            <section aria-labelledby="tpl-stages" className="space-y-2">
              <h4 id="tpl-stages" className="text-sm font-semibold text-slate-900 dark:text-white">
                Stages
              </h4>
              <ul className="space-y-2">
                {stages.map((s, i) => (
                  <li key={s.id} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
                    <Input
                      aria-label={`Stage ${i + 1} name`}
                      value={s.name}
                      maxLength={40}
                      onChange={(e) => setStages((rows) => rows.map((r) => (r.id === s.id ? { ...r, name: e.target.value } : r)))}
                    />
                    <div className="relative">
                      <Input
                        aria-label={`${s.name || "Stage"} credit`}
                        type="number"
                        min={0}
                        max={100}
                        value={s.credit}
                        className="pr-7 tabular-nums"
                        onChange={(e) => setStages((rows) => rows.map((r) => (r.id === s.id ? { ...r, credit: e.target.value } : r)))}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                    </div>
                    <RowActions
                      label={s.name || `stage ${i + 1}`}
                      onUp={i > 0 ? () => setStages((rows) => move(rows, i, -1)) : undefined}
                      onDown={i < stages.length - 1 ? () => setStages((rows) => move(rows, i, 1)) : undefined}
                      onRemove={stages.length > 2 ? () => setStages((rows) => rows.filter((r) => r.id !== s.id)) : undefined}
                    />
                  </li>
                ))}
              </ul>
              {stages.length < 8 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStages((rows) => {
                      // Insert before the last ("done") stage.
                      const next = [...rows];
                      next.splice(Math.max(1, next.length - 1), 0, { id: rowId(), key: null, name: "", credit: "" });
                      return next;
                    })
                  }
                >
                  <Plus /> Add stage
                </Button>
              ) : null}
              <p className="text-xs text-slate-500">First stage earns 0%, last earns 100%, each one more than the last.</p>
            </section>

            {/* N/A rules */}
            <section aria-labelledby="tpl-na" className="space-y-2">
              <div>
                <h4 id="tpl-na" className="text-sm font-semibold text-slate-900 dark:text-white">
                  Not applicable by default
                </h4>
                <p className="text-xs text-slate-500">
                  Ticked trades start as N/A when a zone of that type is added (e.g. no kitchen in a common
                  area). Existing zones don&apos;t change; you can still switch any cell.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/60">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-medium">Trade</th>
                      {ZONE_TYPES.map((z) => (
                        <th key={z.value} scope="col" className="px-2 py-2 text-center font-medium">
                          {z.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                        <th scope="row" className="px-3 py-1.5 text-left font-normal text-slate-700 dark:text-slate-300">
                          {t.name || <span className="text-slate-400">Unnamed</span>}
                        </th>
                        {ZONE_TYPES.map((z) => {
                          const k = `${z.value}|${naKey(t)}`;
                          return (
                            <td key={z.value} className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${t.name || "Trade"} N/A for ${z.label}`}
                                checked={na.has(k)}
                                onChange={(e) =>
                                  setNa((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(k);
                                    else next.delete(k);
                                    return next;
                                  })
                                }
                                className="h-4 w-4 accent-slate-900 dark:accent-slate-100"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {!loading && !parsed.ok ? (
          <ul className="space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {parsed.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          {scope === "project" && view.templateSource === "project" ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={resetToDefaults}>
              Use BuildView defaults
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || loading || !parsed.ok} onClick={save}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {scope === "project" ? "Save for this project" : "Save defaults"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({
  label,
  onUp,
  onDown,
  onRemove,
}: {
  label: string;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
}) {
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-white";
  return (
    <div className="flex">
      <button type="button" className={cls} disabled={!onUp} onClick={onUp} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" className={cls} disabled={!onDown} onClick={onDown} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-4 w-4" />
      </button>
      <button type="button" className={cls} disabled={!onRemove} onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ plan

/**
 * Planned start / end per trade per zoned floor. A zoned floor's planned % is
 * its trades' planned % weighted like the actual, so Completion and the S-curve
 * compare like with like. CSV round-trips the same grid.
 */
export function PlanEditorDialog({
  view,
  open,
  onOpenChange,
  onSaved,
}: {
  view: Ready;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (view: ZoneProgressView) => void;
}) {
  const floors = useMemo(
    () => view.floors.filter((f) => f.zones.length > 0).map((f) => ({ floorId: f.floorId, label: f.label })),
    [view.floors]
  );
  const [cells, setCells] = useState<Record<string, { start: string; end: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<{ kind: "ok" | "warn"; lines: string[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, { start: string; end: string }> = {};
    for (const p of view.plans) next[`${p.floorId}:${p.activityKey}`] = { start: p.start, end: p.end };
    setCells(next);
    setError(null);
    setImportNote(null);
  }, [open, view.plans]);

  const setCell = (key: string, field: "start" | "end", value: string) =>
    setCells((prev) => ({ ...prev, [key]: { start: prev[key]?.start ?? "", end: prev[key]?.end ?? "", [field]: value } }));

  /** Plans from the grid; problems listed so Save can explain itself. */
  const { plans, problems } = useMemo(() => {
    const out: ActivityPlan[] = [];
    const issues: string[] = [];
    for (const floor of floors) {
      for (const a of view.activities) {
        const c = cells[`${floor.floorId}:${a.key}`];
        if (!c || (!c.start && !c.end)) continue;
        if (!c.start || !c.end) issues.push(`${floor.label} · ${a.name}: add both dates or clear both.`);
        else if (c.end < c.start) issues.push(`${floor.label} · ${a.name}: end is before start.`);
        else out.push({ floorId: floor.floorId, activityKey: a.key, start: c.start, end: c.end });
      }
    }
    return { plans: out, problems: issues };
  }, [cells, floors, view.activities]);

  function exportCsv() {
    const csv = plansToCsv(floors, view.activities, plans);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trade-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    setImportNote(null);
    if (file.size > 1_000_000) {
      setImportNote({ kind: "warn", lines: ["That file is over 1 MB. Export the template and fill that in."] });
      return;
    }
    const text = await file.text();
    const result = parsePlanCsv(text, floors, view.activities);
    if (result.plans.length > 0) {
      setCells((prev) => {
        const next = { ...prev };
        for (const p of result.plans) next[`${p.floorId}:${p.activityKey}`] = { start: p.start, end: p.end };
        return next;
      });
    }
    setImportNote({
      kind: result.errors.length > 0 ? "warn" : "ok",
      lines: [
        `Filled ${result.plans.length} ${result.plans.length === 1 ? "row" : "rows"} from ${file.name}. Review, then save.`,
        ...result.errors.slice(0, 8),
        ...(result.errors.length > 8 ? [`…and ${result.errors.length - 8} more.`] : []),
      ],
    });
  }

  function save() {
    if (problems.length > 0) return;
    setError(null);
    startTransition(async () => {
      const result = await saveActivityPlans({ projectId: view.projectId, plans });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.view);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trade plan</DialogTitle>
          <DialogDescription>
            When each trade should start and finish on each zoned floor. The floor&apos;s planned % follows
            these dates, weighted like the actual, so Completion and the S-curve show if you&apos;re ahead or
            behind. Leave a trade blank to skip it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download /> Download CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload /> Import CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importCsv(file);
            }}
          />
          <p className="text-xs text-slate-500">
            Columns: Floor, Trade, Planned start, Planned end. Dates as YYYY-MM-DD or DD/MM/YYYY.
          </p>
        </div>

        {importNote ? (
          <ul
            aria-live="polite"
            className={cn(
              "space-y-0.5 rounded-lg px-3 py-2 text-xs",
              importNote.kind === "ok"
                ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            )}
          >
            {importNote.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}

        {floors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
            Add zones to a floor first. Floors without zones keep their checklist dates.
          </p>
        ) : (
          <div className="space-y-5">
            {floors.map((floor) => (
              <section key={floor.floorId} aria-label={floor.label} className="rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="grid items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 sm:grid-cols-[1fr_10rem_10rem_auto] dark:border-slate-800 dark:bg-slate-950/60">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{floor.label}</h4>
                  <span aria-hidden className="hidden text-xs font-medium text-slate-500 sm:block">Planned start</span>
                  <span aria-hidden className="hidden text-xs font-medium text-slate-500 sm:block">Planned end</span>
                  <span aria-hidden className="hidden w-12 sm:block" />
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {view.activities.map((a) => {
                    const key = `${floor.floorId}:${a.key}`;
                    const c = cells[key] ?? { start: "", end: "" };
                    const bad = Boolean((c.start || c.end) && (!c.start || !c.end || c.end < c.start));
                    return (
                      <div key={a.key} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_10rem_10rem_auto]">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
                        <Input
                          type="date"
                          aria-label={`${floor.label} ${a.name} planned start`}
                          value={c.start}
                          onChange={(e) => setCell(key, "start", e.target.value)}
                          aria-invalid={bad || undefined}
                          className={cn(bad && "border-amber-500")}
                        />
                        <Input
                          type="date"
                          aria-label={`${floor.label} ${a.name} planned end`}
                          value={c.end}
                          min={c.start || undefined}
                          onChange={(e) => setCell(key, "end", e.target.value)}
                          aria-invalid={bad || undefined}
                          className={cn(bad && "border-amber-500")}
                        />
                        <button
                          type="button"
                          disabled={!c.start && !c.end}
                          onClick={() =>
                            setCells((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            })
                          }
                          className="min-h-9 rounded-md px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          Clear
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {problems.length > 0 ? (
          <ul className="space-y-0.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {problems.slice(0, 6).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2">
          <span className="mr-auto self-center text-xs text-slate-500 tabular-nums">
            {plans.length} planned {plans.length === 1 ? "trade" : "trades"}
          </span>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || problems.length > 0 || floors.length === 0} onClick={save}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Save plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Header buttons for the Zones & trades card. */
export function TemplateToolbar({ view, onSaved }: { view: Ready; onSaved: (view: ZoneProgressView) => void }) {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  if (!view.canEditTemplate && !view.canManage) return null;
  return (
    <>
      {view.canManage ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
          <CalendarRange /> Trade plan
          {view.plans.length > 0 ? (
            <span className="rounded bg-slate-100 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {view.plans.length}
            </span>
          ) : null}
        </Button>
      ) : null}
      {view.canEditTemplate ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
          <Settings2 /> Trades &amp; stages
        </Button>
      ) : null}
      {view.canManage ? <PlanEditorDialog view={view} open={planOpen} onOpenChange={setPlanOpen} onSaved={onSaved} /> : null}
      {view.canEditTemplate ? (
        <TemplateEditorDialog view={view} open={templateOpen} onOpenChange={setTemplateOpen} onSaved={onSaved} />
      ) : null}
    </>
  );
}
