"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getCompletionHistoryAction } from "@/lib/actions/progression";
import type { CompletionHistory } from "@/lib/data/progression";
import { formatPercent } from "@/lib/progression/completion";
import type { SCurvePoint } from "@/lib/progression/s-curve";
import { cn, formatDate } from "@/lib/utils";

// Validated (dataviz validator, light #fcfcfb / dark #1a1a19 surfaces):
// Actual = green, Planned = blue (dashed as secondary encoding).
const ACTUAL = "stroke-[#4d7c0f] dark:stroke-[#6b9a1a]";
const ACTUAL_FILL = "fill-[#4d7c0f] dark:fill-[#6b9a1a]";
const PLANNED = "stroke-[#2563eb] dark:stroke-[#5b8def]";
const PLANNED_FILL = "fill-[#2563eb] dark:fill-[#5b8def]";

const W = 640;
const H = 240;
const PAD = { top: 16, right: 64, bottom: 28, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const dayMs = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};

function shortMonth(d: string): string {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(dayMs(d))
  );
}

/**
 * S-curve: planned vs actual completion over time (Milestone 5). Actual stops
 * at today; planned runs to the latest deadline. Hover for exact values.
 */
export function CompletionSCurve({ projectId, refreshKey }: { projectId: string; refreshKey?: number }) {
  const [history, setHistory] = useState<CompletionHistory | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCompletionHistoryAction(projectId)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => !cancelled && setHistory(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  if (history === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }
  if (history === null) return null;
  return <SCurveView history={history} />;
}

/** Presentational S-curve for a loaded history (also used in previews/tests). */
export function SCurveView({ history }: { history: CompletionHistory }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = useMemo(() => history.points, [history]);
  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = dayMs(points[0].date);
    const t1 = dayMs(points[points.length - 1].date);
    const x = (d: string) => PAD.left + ((dayMs(d) - t0) / Math.max(1, t1 - t0)) * PLOT_W;
    const y = (v: number) => PAD.top + (1 - v / 100) * PLOT_H;
    const path = (key: "actual" | "planned") =>
      points
        .filter((p) => p[key] != null)
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p[key] as number).toFixed(1)}`)
        .join(" ");
    const months: string[] = [];
    const seen = new Set<string>();
    for (const p of points) {
      const label = shortMonth(p.date);
      if (!seen.has(label)) {
        seen.add(label);
        months.push(p.date);
      }
    }
    const every = Math.ceil(months.length / 6);
    return { x, y, actualPath: path("actual"), plannedPath: path("planned"), ticks: months.filter((_, i) => i % every === 0) };
  }, [points]);

  const lastActual = [...points].reverse().find((p) => p.actual != null) ?? null;
  const lastPlanned = [...points].reverse().find((p) => p.planned != null) ?? null;
  const hasPlan = points.some((p) => p.planned != null);
  const todayPoint = lastActual;
  const hovered: SCurvePoint | null = hover != null ? points[hover] ?? null : null;

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!geometry || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(geometry.x(p.date) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <section aria-labelledby="scurve-heading" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="scurve-heading" className="flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
            <TrendingUp className="h-4 w-4 text-slate-500" aria-hidden />
            Progress over time
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Actual completion against the plan, rebuilt from dated checklist and zone updates.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" strokeWidth="2" className={ACTUAL} /></svg>
            Actual
          </span>
          {hasPlan ? (
            <span className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" strokeWidth="2" strokeDasharray="4 3" className={PLANNED} /></svg>
              Planned
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            className="min-h-9 rounded-md border border-slate-200 px-2.5 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {asTable ? "Show chart" : "Show table"}
          </button>
        </div>
      </div>

      {!geometry ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
          The curve appears once steps are ended, zones are updated or floors have start and deadline dates.
        </p>
      ) : asTable ? (
        <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-500 dark:bg-slate-950">
              <tr>
                <th scope="col" className="px-3 py-2">Date</th>
                <th scope="col" className="px-3 py-2 text-right">Actual</th>
                <th scope="col" className="px-3 py-2 text-right">Planned</th>
                <th scope="col" className="px-3 py-2 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {points.map((p) => (
                <tr key={p.date}>
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{formatDate(p.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.actual != null ? formatPercent(p.actual) : ""}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.planned != null ? formatPercent(p.planned) : ""}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                    {p.actual != null && p.planned != null
                      ? `${p.actual - p.planned >= 0 ? "+" : "−"}${Math.abs(Math.round((p.actual - p.planned) * 10) / 10)} pts`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`S-curve: actual ${lastActual ? formatPercent(lastActual.actual) : ""}${hasPlan && todayPoint?.planned != null ? `, planned ${formatPercent(todayPoint.planned)}` : ""} today`}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={geometry.y(v)} y2={geometry.y(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={1} />
                <text x={PAD.left - 6} y={geometry.y(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                  {v}%
                </text>
              </g>
            ))}
            {geometry.ticks.map((d) => (
              <text key={d} x={geometry.x(d)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {shortMonth(d)}
              </text>
            ))}
            {todayPoint ? (
              <g>
                <line x1={geometry.x(todayPoint.date)} x2={geometry.x(todayPoint.date)} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-slate-300 dark:stroke-slate-700" strokeDasharray="2 3" />
                <text x={geometry.x(todayPoint.date)} y={PAD.top - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">
                  Today
                </text>
              </g>
            ) : null}
            {hasPlan ? (
              <path d={geometry.plannedPath} fill="none" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" className={PLANNED} />
            ) : null}
            <path d={geometry.actualPath} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={ACTUAL} />

            {/* Direct end labels */}
            {lastActual?.actual != null ? (
              <text x={geometry.x(lastActual.date) + 6} y={geometry.y(lastActual.actual) + 4} className="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200">
                {formatPercent(lastActual.actual)}
              </text>
            ) : null}
            {hasPlan && lastPlanned?.planned != null ? (
              <text x={geometry.x(lastPlanned.date) + 6} y={geometry.y(lastPlanned.planned) + 4} className="fill-slate-500 text-[11px] dark:fill-slate-400">
                Plan {formatPercent(lastPlanned.planned)}
              </text>
            ) : null}

            {hovered ? (
              <g>
                <line x1={geometry.x(hovered.date)} x2={geometry.x(hovered.date)} y1={PAD.top} y2={PAD.top + PLOT_H} className="stroke-slate-400" strokeWidth={1} />
                {hovered.actual != null ? (
                  <circle cx={geometry.x(hovered.date)} cy={geometry.y(hovered.actual)} r={4.5} strokeWidth={2} className={cn(ACTUAL_FILL, "stroke-white dark:stroke-slate-900")} />
                ) : null}
                {hovered.planned != null ? (
                  <circle cx={geometry.x(hovered.date)} cy={geometry.y(hovered.planned)} r={4.5} strokeWidth={2} className={cn(PLANNED_FILL, "stroke-white dark:stroke-slate-900")} />
                ) : null}
              </g>
            ) : null}
          </svg>

          {hovered ? (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
              style={{
                left: `${(geometry.x(hovered.date) / W) * 100}%`,
                transform: geometry.x(hovered.date) > W * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
              }}
            >
              <p className="font-semibold text-slate-900 dark:text-white">{formatDate(hovered.date)}</p>
              {hovered.actual != null ? <p className="text-slate-700 dark:text-slate-300">Actual {formatPercent(hovered.actual)}</p> : null}
              {hovered.planned != null ? <p className="text-slate-700 dark:text-slate-300">Planned {formatPercent(hovered.planned)}</p> : null}
              {hovered.actual != null && hovered.planned != null ? (
                <p className="text-slate-500">
                  {hovered.actual - hovered.planned >= 0 ? "+" : "−"}
                  {Math.abs(Math.round((hovered.actual - hovered.planned) * 10) / 10)} pts vs plan
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {history.snapshots.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Daily record kept since {formatDate(history.snapshots[0].date)} ({history.snapshots.length} day
          {history.snapshots.length === 1 ? "" : "s"}).
        </p>
      ) : null}
    </section>
  );
}
