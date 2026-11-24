"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Grid3x3, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createZone,
  deleteZone,
  getZoneProgress,
  recordObservation,
  setFloorPlan,
  setRollupBasis,
  setZoneNa,
  setZonePolygon,
  verifyObservation,
  type ZoneFloorView,
  type ZoneProgressView,
} from "@/lib/actions/zone-progress";
import { formatPercent } from "@/lib/progression/completion";
import { FloorPlanHeatmap } from "@/components/projects/progression/floor-plan-heatmap";
import { TemplateToolbar } from "@/components/projects/progression/completion-template-editors";
import type { ZoneCell } from "@/lib/progression/zone-completion";
import { cn, formatDate } from "@/lib/utils";

const NA_VALUE = "__na";
const APPLICABLE_VALUE = "__applicable";

const ZONE_TYPE_LABELS: Record<string, string> = {
  flat: "Flat",
  unit: "Unit",
  room: "Room",
  common: "Common area",
  other: "Other",
};

/** Colour a cell by the credit it earns (0 → grey, partial → amber/sky, 100 → green). */
function creditTone(percent: number | null): string {
  if (percent == null) return "bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500";
  if (percent >= 100) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
  if (percent >= 50) return "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100";
  if (percent > 0) return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
  return "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300";
}

type Ready = Extract<ZoneProgressView, { available: true }>;

/**
 * Zones & trades (Milestone 4): flats / units / rooms per floor, a matrix of
 * zones × activities with stage chips, trade totals, and review of updates.
 * A floor with zones takes its % from them; other floors use the checklist.
 */
export function ZoneProgressSection({
  projectId,
  onChanged,
}: {
  projectId: string;
  /** Called after any change so the Completion card can reload. */
  onChanged?: () => void;
}) {
  const [view, setView] = useState<ZoneProgressView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getZoneProgress(projectId).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function run(key: string, action: () => Promise<{ ok: true; view: ZoneProgressView } | { ok: false; error: string }>) {
    setError(null);
    setBusyKey(key);
    startTransition(async () => {
      const result = await action();
      setBusyKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setView(result.view);
      onChanged?.();
    });
  }

  if (!view) {
    return <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }
  if (!view.available) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">
        <h3 className="mb-1 font-display text-base font-semibold text-slate-900 dark:text-white">Zones & trades</h3>
        {view.reason}
      </section>
    );
  }

  const zonedFloors = view.floors.filter((f) => f.zones.length > 0);

  return (
    <section aria-labelledby="zones-heading" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="zones-heading" className="flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
            <Grid3x3 className="h-4 w-4 text-slate-500" aria-hidden />
            Zones &amp; trades
          </h3>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Track each flat, unit or room by trade. A floor with zones takes its % from them
            (weighted by {view.basis === "equal" ? "equal share per zone" : "zone area"}); floors without
            zones use the checklist.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <TemplateToolbar
          view={view}
          onSaved={(next) => {
            setView(next);
            onChanged?.();
          }}
        />
        {view.canManage ? (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            Roll up by
            <select
              value={view.basis === "custom" ? "area" : view.basis}
              disabled={busyKey === "basis"}
              onChange={(e) =>
                run("basis", () =>
                  setRollupBasis({ projectId, basis: e.target.value as "area" | "equal" })
                )
              }
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="area">Zone area</option>
              <option value="equal">Equal per zone</option>
            </select>
          </label>
        ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
          {error}
        </p>
      ) : null}

      {view.canManage ? <AddZoneForm view={view} busy={busyKey === "add"} onAdd={(fields) => run("add", () => createZone({ projectId, ...fields }))} /> : null}

      {zonedFloors.length > 0 ? (
        <p className="text-xs text-slate-500">
          Pick each trade&apos;s stage per zone:{" "}
          {view.stages.map((st) => `${st.name} ${Math.round(st.credit)}%`).join(", ")}.
          A zone&apos;s % adds up each stage × the trade&apos;s weight; the floor % weights zones by area.
          {view.templateSource === "project" ? " This project uses its own trades and stages." : ""}
        </p>
      ) : null}

      {zonedFloors.length > 0 ? <TradeSummary view={view} /> : null}

      {zonedFloors.length === 0 ? (
        <EmptyZones view={view} />
      ) : (
        <div className="space-y-6">
          {zonedFloors.map((floor) => (
            <FloorMatrix
              key={floor.floorId}
              floor={floor}
              view={view}
              busyKey={busyKey}
              onStage={(zoneId, activityKey, stageKey) =>
                run(`${zoneId}:${activityKey}`, () =>
                  recordObservation({ projectId, zoneId, activityKey, stageKey })
                )
              }
              onNa={(zoneId, activityKey, na) =>
                run(`${zoneId}:${activityKey}`, () => setZoneNa({ projectId, zoneId, activityKey, na }))
              }
              onDelete={(zoneId) => run(`zone:${zoneId}`, () => deleteZone({ projectId, zoneId }))}
              onVerify={(observationId, decision) =>
                run(`obs:${observationId}`, () => verifyObservation({ projectId, observationId, decision }))
              }
              projectId={projectId}
              onSetPlan={(path) =>
                run(`plan:${floor.floorId}`, () => setFloorPlan({ projectId, floorId: floor.floorId, path }))
              }
              onSavePolygon={(zoneId, polygon) =>
                run(`plan:${floor.floorId}`, () => setZonePolygon({ projectId, zoneId, polygon }))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AddZoneForm({
  view,
  busy,
  onAdd,
}: {
  view: Ready;
  busy: boolean;
  onAdd: (fields: { floorId: string; name: string; zoneType: string; area: number | null }) => void;
}) {
  const [floorId, setFloorId] = useState(view.floors[0]?.floorId ?? "");
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState("flat");
  const [area, setArea] = useState("");

  if (view.floors.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        This project has no buildings or floors yet. BuildView adds them; zones go on a floor.
      </p>
    );
  }

  return (
    <form
      className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1.4fr_1.2fr_1fr_0.8fr_auto] dark:bg-slate-950/60"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !floorId) return;
        const parsedArea = area.trim() ? Number(area) : null;
        onAdd({ floorId, name: name.trim(), zoneType, area: Number.isFinite(parsedArea) ? parsedArea : null });
        setName("");
        setArea("");
      }}
    >
      <select
        aria-label="Floor"
        value={floorId}
        onChange={(e) => setFloorId(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
      >
        {view.floors.map((f) => (
          <option key={f.floorId} value={f.floorId}>
            {f.label}
          </option>
        ))}
      </select>
      <Input aria-label="Zone name" placeholder="e.g. Flat 301" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <select
        aria-label="Zone type"
        value={zoneType}
        onChange={(e) => setZoneType(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
      >
        {Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Input aria-label="Area in sq ft" placeholder="Area sq ft" type="number" min={1} value={area} onChange={(e) => setArea(e.target.value)} />
      <Button type="submit" disabled={busy || !name.trim()} className="h-10 bg-slate-900 text-white hover:bg-slate-800">
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
        Add zone
      </Button>
    </form>
  );
}

function FloorMatrix({
  floor,
  view,
  busyKey,
  onStage,
  onNa,
  onDelete,
  onVerify,
  projectId,
  onSetPlan,
  onSavePolygon,
}: {
  floor: ZoneFloorView;
  view: Ready;
  busyKey: string | null;
  projectId: string;
  onSetPlan: (path: string | null) => void;
  onSavePolygon: (zoneId: string, polygon: [number, number][] | null) => void;
  onStage: (zoneId: string, activityKey: string, stageKey: string) => void;
  onNa: (zoneId: string, activityKey: string, na: boolean) => void;
  onDelete: (zoneId: string) => void;
  onVerify: (observationId: string, decision: "verified" | "rejected") => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mode, setMode] = useState<"table" | "plan">(floor.planUrl ? "plan" : "table");
  const stageName = new Map(view.stages.map((s) => [s.key, s.name]));
  const totalWeight = view.activities.reduce((sum, a) => sum + a.weight, 0) || 1;
  const pending = floor.zones.flatMap((zone) =>
    view.activities
      .map((activity) => ({ zone, activity, cell: zone.cells[activity.key] }))
      .filter(({ cell }) => cell?.latestStatus === "pending" && cell.latestObservationId)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
          {floor.label}
          <span className="ml-2 font-normal tabular-nums text-slate-500">
            {formatPercent(floor.percent)}
          </span>
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          {view.canVerify && pending.length > 0 ? (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="min-h-11 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              Review {pending.length} update{pending.length === 1 ? "" : "s"}
            </button>
          ) : null}
          <div role="radiogroup" aria-label={`View for ${floor.label}`} className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {(["table", "plan"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "min-h-9 rounded-md px-3 text-xs font-semibold",
                  mode === m
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {m === "table" ? "Table" : "Plan"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "plan" ? (
        <FloorPlanHeatmap
          projectId={projectId}
          floor={floor}
          view={view}
          busy={busyKey === `plan:${floor.floorId}`}
          onSetPlan={onSetPlan}
          onSavePolygon={onSavePolygon}
        />
      ) : (

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 dark:bg-slate-950">
              <th scope="col" className="sticky left-0 z-10 bg-slate-50 px-3 py-2 dark:bg-slate-950">Zone</th>
              {view.activities.map((a) => (
                <th key={a.key} scope="col" className="px-2 py-2">
                  {a.name}
                  <span
                    className="block text-[11px] font-normal text-slate-400"
                    title="How much this trade counts toward a zone's %"
                  >
                    weight {Math.round((a.weight / totalWeight) * 100)}%
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right">Zone %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {floor.zones.map((zone) => (
              <tr key={zone.id}>
                <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-900 dark:bg-slate-900 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate">{zone.name}</span>
                    {view.canManage ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove ${zone.name}? Its updates stop counting.`)) onDelete(zone.id);
                        }}
                        disabled={busyKey === `zone:${zone.id}`}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:text-red-600"
                        aria-label={`Remove ${zone.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs font-normal text-slate-500">
                    {ZONE_TYPE_LABELS[zone.zoneType] ?? zone.zoneType}
                    {zone.area ? ` · ${new Intl.NumberFormat("en-IN").format(zone.area)} sq ft` : ""}
                  </p>
                </th>
                {view.activities.map((activity) => (
                  <td key={activity.key} className="px-1.5 py-1.5">
                    <StageCell
                      cell={zone.cells[activity.key]}
                      stages={view.stages}
                      stageName={stageName}
                      canRecord={view.canRecord}
                      canManage={view.canManage}
                      busy={busyKey === `${zone.id}:${activity.key}`}
                      label={`${activity.name} in ${zone.name}`}
                      onChange={(value) => {
                        if (value === NA_VALUE) onNa(zone.id, activity.key, true);
                        else if (value === APPLICABLE_VALUE) onNa(zone.id, activity.key, false);
                        else onStage(zone.id, activity.key, value);
                      }}
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatPercent(zone.percent)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 dark:bg-slate-950">
              <th scope="row" className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Trade %
              </th>
              {view.activities.map((a) => (
                <td key={a.key} className="px-2 py-2 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {floor.trades[a.key] == null ? "N/A" : formatPercent(floor.trades[a.key])}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatPercent(floor.percent)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review updates · {floor.label}</DialogTitle>
          </DialogHeader>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting for review.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {pending.map(({ zone, activity, cell }) => (
                <li key={cell.latestObservationId} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      {zone.name} · {activity.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {stageName.get(cell.latestStageKey ?? "") ?? cell.latestStageKey}
                      {cell.latestObservedOn ? ` · ${formatDate(cell.latestObservedOn)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      className="h-9 bg-slate-900 text-white hover:bg-slate-800"
                      disabled={busyKey === `obs:${cell.latestObservationId}`}
                      onClick={() => onVerify(cell.latestObservationId!, "verified")}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={busyKey === `obs:${cell.latestObservationId}`}
                      onClick={() => onVerify(cell.latestObservationId!, "rejected")}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StageCell({
  cell,
  stages,
  stageName,
  canRecord,
  canManage,
  busy,
  label,
  onChange,
}: {
  cell: ZoneCell | undefined;
  stages: { key: string; name: string; credit: number }[];
  stageName: Map<string, string>;
  canRecord: boolean;
  canManage: boolean;
  busy: boolean;
  label: string;
  onChange: (value: string) => void;
}) {
  const na = cell?.percent == null;
  const shownKey = cell?.latestStageKey ?? cell?.countedStageKey ?? "not_started";
  const pending = cell?.latestStatus === "pending";
  const rejected = cell?.latestStatus === "rejected";
  const text = na ? "N/A" : (stageName.get(shownKey) ?? "Not started");
  const title = na
    ? "Not applicable in this zone"
    : pending
      ? "Updated, awaiting review"
      : rejected
        ? "Latest update was rejected"
        : cell?.latestObservedOn
          ? `Updated ${formatDate(cell.latestObservedOn)}`
          : "No update yet";

  if (!canRecord && !canManage) {
    return (
      <span title={title} className={cn("block rounded-md px-2 py-1.5 text-xs font-medium", creditTone(cell?.percent ?? null), pending && "ring-1 ring-amber-400")}>
        {text}
      </span>
    );
  }

  return (
    <div className="relative">
      <select
        aria-label={label}
        title={title}
        disabled={busy || (na && !canManage)}
        value={na ? NA_VALUE : shownKey}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full min-w-[108px] cursor-pointer rounded-md border-0 px-2 text-xs font-medium",
          creditTone(cell?.percent ?? null),
          pending && "ring-1 ring-amber-400",
          rejected && "ring-1 ring-red-400"
        )}
      >
        {!na
          ? stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))
          : null}
        {canManage ? (
          na ? (
            <>
              <option value={NA_VALUE}>N/A</option>
              <option value={APPLICABLE_VALUE}>Make applicable</option>
            </>
          ) : (
            <option value={NA_VALUE}>N/A in this zone</option>
          )
        ) : na ? (
          <option value={NA_VALUE}>N/A</option>
        ) : null}
      </select>
      {busy ? <Loader2 className="absolute right-1 top-2.5 h-3.5 w-3.5 animate-spin text-slate-500" /> : null}
    </div>
  );
}

/** Empty state: what will be tracked, and the next step for this viewer. */
function EmptyZones({ view }: { view: Ready }) {
  const totalWeight = view.activities.reduce((sum, a) => sum + a.weight, 0) || 1;
  return (
    <div className="space-y-4 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">No zones on this project yet</p>
        <p className="mt-0.5 text-sm text-slate-500">
          {view.canManage
            ? view.floors.length === 0
              ? "This project has no buildings or floors yet. BuildView adds them; then you can add zones here."
              : "Use the form above to add the flats or rooms on a floor. Each zone then gets a row with these trades."
            : "Your Client Admin, site team or BuildView sets up the flats and rooms. Until then, floors use the checklist above."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trades and their weight</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {view.activities.map((a) => (
              <li key={a.key} className="flex justify-between gap-3">
                <span>{a.name}</span>
                <span className="tabular-nums text-slate-500">{Math.round((a.weight / totalWeight) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stages and credit</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {view.stages.map((st) => (
              <li key={st.key} className="flex justify-between gap-3">
                <span>{st.name}</span>
                <span className="tabular-nums text-slate-500">{Math.round(st.credit)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Building-wide trade %: every zone, weighted like the floors. One hue (magnitude). */
function TradeSummary({ view }: { view: Ready }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trade summary · whole project</p>
      <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {view.activities.map((a) => {
          const value = view.projectTrades[a.key];
          return (
            <li key={a.key} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  {value == null ? "N/A" : formatPercent(value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#4d7c0f] dark:bg-[#6b9a1a]"
                  style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
