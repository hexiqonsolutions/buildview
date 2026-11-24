import type { ProgressReport, ReportChange } from "@/lib/data/progress-report";
import {
  formatPercent,
  SCHEDULE_STATUS_LABELS,
  type ScheduleStatus,
} from "@/lib/progression/completion";
import { HEAT_LEGEND, heatFill, polygonCentroid } from "@/lib/progression/heat";
import { formatDate } from "@/lib/utils";

/**
 * Printable progress report (Milestone 7). Server-rendered, light "paper" only,
 * sized for A4. Numbers come from the same formula as the Progression tab.
 */

const ACTUAL = "#4d7c0f";
const PLANNED = "#2563eb";

const STATUS_TONE: Record<ScheduleStatus, string> = {
  complete: "bg-emerald-100 text-emerald-900",
  ahead: "bg-lime-100 text-lime-900",
  behind_lt20: "bg-amber-100 text-amber-900",
  behind_gte20: "bg-red-100 text-red-900",
  not_started: "bg-slate-100 text-slate-700",
  no_schedule: "bg-slate-100 text-slate-600",
};

const ZONE_TYPE_LABELS: Record<string, string> = {
  flat: "Flat",
  unit: "Unit",
  room: "Room",
  common: "Common area",
  other: "Other",
};

const fmtDay = (d: string) => formatDate(d);

function pts(value: number | null): string {
  if (value == null) return "—";
  const r = Math.round(value * 10) / 10;
  return `${r > 0 ? "+" : ""}${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)} pts`;
}

function StatusChip({ status }: { status: ScheduleStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status]}`}>
      {SCHEDULE_STATUS_LABELS[status]}
    </span>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="report-section mt-8">
      <h2 id={id} className="mb-3 border-b border-slate-200 pb-1.5 font-display text-[15px] font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProgressReportView({ report }: { report: ProgressReport }) {
  const { summary, zones } = report;
  const zonedFloors = zones?.floors.filter((f) => f.zones.length > 0) ?? [];
  const steps = report.changes.filter((c) => c.kind === "step").length;
  const zoneUpdates = report.changes.length - steps;
  const pendingInPeriod = report.changes.filter((c) => c.status === "pending").length;

  return (
    <article className="report-paper mx-auto max-w-[210mm] bg-white px-4 py-6 text-slate-900 sm:px-[14mm] sm:py-[12mm]">
      {/* Cover */}
      <header className="report-cover flex flex-col items-start justify-between gap-3 border-b-2 border-slate-900 pb-4 sm:flex-row sm:gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Progress report</p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight">{report.project.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {[report.project.clientName, report.project.location].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <dl className="shrink-0 text-xs text-slate-600 sm:text-right">
          <div>
            <dt className="inline">Period: </dt>
            <dd className="inline font-semibold text-slate-900">
              {fmtDay(report.from)} – {fmtDay(report.to)}
            </dd>
          </div>
          <div className="mt-0.5">
            <dt className="inline">Generated: </dt>
            <dd className="inline">{fmtDay(report.generatedOn)}</dd>
          </div>
          <div className="mt-2 font-display text-sm font-bold tracking-tight text-slate-900">BuildView</div>
        </dl>
      </header>

      {/* Headline */}
      <section aria-label="Completion" className="report-section report-stats mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Actual" value={formatPercent(summary.actual)} strong />
        <Stat label="Planned" value={formatPercent(summary.planned)} />
        <Stat label="Variance" value={pts(summary.variance)} />
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-2">
            <StatusChip status={summary.status} />
          </div>
        </div>
      </section>
      <p className="mt-2 text-xs text-slate-600">
        Across {report.floorCount} {report.floorCount === 1 ? "floor" : "floors"}
        {report.unstartedFloorCount > 0 ? ` · ${report.unstartedFloorCount} not started (counted as 0%)` : ""}
        {report.scheduledFloorCount === 0
          ? ". No floor has a planned schedule yet, so planned %, variance and status aren't shown"
          : report.scheduledFloorCount < report.floorCount
            ? ` · planned %, variance and status use the ${report.scheduledFloorCount} scheduled ${report.scheduledFloorCount === 1 ? "floor" : "floors"}`
            : ""}
        .{" "}
        {report.verifiedOnly
          ? "Only verified work is counted."
          : "Recorded work counts before it is verified."}
        {report.pendingReviewCount > 0 ? ` ${report.pendingReviewCount} checklist steps await review.` : ""}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        This period: {steps} checklist {steps === 1 ? "step" : "steps"} ended, {zoneUpdates} zone{" "}
        {zoneUpdates === 1 ? "update" : "updates"}
        {pendingInPeriod > 0 ? `, ${pendingInPeriod} not yet verified` : ""}.
      </p>

      {/* S-curve */}
      <Section title="Planned vs actual over time" id="r-scurve">
        {report.history.length >= 2 ? (
          <SCurve report={report} />
        ) : (
          <p className="text-sm text-slate-500">
            The curve needs counted progress on at least two different dates, or a planned schedule. It will
            appear as work is recorded over time.
          </p>
        )}
      </Section>

      {/* Floors */}
      <Section title="Floors" id="r-floors">
        <div className="report-scroll overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-1.5 pr-2 font-semibold">Floor</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Actual</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Planned</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Variance</th>
              <th scope="col" className="py-1.5 pr-2 font-semibold">Status</th>
              <th scope="col" className="py-1.5 pr-2 font-semibold">Measured by</th>
              <th scope="col" className="py-1.5 font-semibold">Latest 360 scan</th>
            </tr>
          </thead>
          <tbody>
            {report.floors.map((f) => (
              <tr key={f.floorId} className="report-row border-b border-slate-100">
                <th scope="row" className="py-1.5 pr-2 text-left font-medium">
                  {f.building} · {f.floor}
                </th>
                <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{formatPercent(f.summary.actual)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">{formatPercent(f.summary.planned)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">{pts(f.summary.variance)}</td>
                <td className="py-1.5 pr-2">
                  <StatusChip status={f.summary.status} />
                </td>
                <td className="py-1.5 pr-2 text-slate-600">{f.basis === "zones" ? "Zones" : "Checklist"}</td>
                <td className="py-1.5">
                  {f.latestScan ? (
                    <a href={f.latestScan.url} className="text-blue-700 underline underline-offset-2">
                      {f.latestScan.date ? fmtDay(f.latestScan.date) : f.latestScan.name}
                    </a>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Section>

      {/* Trades */}
      {zones && zonedFloors.length > 0 ? (
        <Section title="Trade summary · zoned floors" id="r-trades">
          <ul className="report-two grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {zones.activities.map((a) => {
              const v = zones.projectTrades[a.key];
              return (
                <li key={a.key} className="report-row">
                  <div className="flex justify-between text-[12px]">
                    <span>
                      {a.name} <span className="text-slate-400">· weight {Math.round(a.weight)}%</span>
                    </span>
                    <span className="font-semibold tabular-nums">{v == null ? "N/A" : formatPercent(v)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: ACTUAL }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {/* Floor plans + zone matrices */}
      {zones && zonedFloors.length > 0 ? (
        <Section title="Zones by floor" id="r-zones">
          <HeatLegend />
          <div className="space-y-8">
            {zonedFloors.map((floor) => (
              <div key={floor.floorId} className="report-floor">
                <h3 className="mb-2 flex items-baseline justify-between text-[13px] font-semibold">
                  <span>{floor.label}</span>
                  <span className="tabular-nums">{formatPercent(floor.percent)}</span>
                </h3>
                {floor.planUrl && floor.zones.some((z) => z.polygon && z.polygon.length >= 3) ? (
                  <div className="report-plan relative mb-3 overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={floor.planUrl} alt={`Floor plan · ${floor.label}`} className="block h-auto w-full" />
                    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                      {floor.zones.map((z) =>
                        z.polygon && z.polygon.length >= 3 ? (
                          <polygon
                            key={z.id}
                            points={z.polygon.map(([x, y]) => `${x * 1000},${y * 1000}`).join(" ")}
                            fill={heatFill(z.percent).fill}
                            stroke="#ffffff"
                            strokeWidth={4}
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : null
                      )}
                    </svg>
                    {floor.zones.map((z) => {
                      if (!z.polygon || z.polygon.length < 3) return null;
                      const [cx, cy] = polygonCentroid(z.polygon);
                      return (
                        <span
                          key={z.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/90 px-1 text-[10px] font-semibold leading-tight text-slate-900"
                          style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
                        >
                          {z.name} · {formatPercent(z.percent)}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                <div className="report-scroll overflow-x-auto">
                  <ZoneMatrix floor={floor} zones={zones} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Changes */}
      <Section title={`Changes ${fmtDay(report.from)} – ${fmtDay(report.to)}`} id="r-changes">
        {report.changes.length === 0 ? (
          <p className="text-sm text-slate-500">No checklist steps ended and no zone updates in this period.</p>
        ) : (
          <>
            <div className="report-scroll overflow-x-auto">
              <ChangesTable changes={report.changes} />
            </div>
            {report.changesTruncated ? (
              <p className="mt-2 text-xs text-slate-500">Showing the latest 300 changes. Use the Excel export for the full list.</p>
            ) : null}
          </>
        )}
      </Section>

      {/* Method */}
      <Section title="How the % is calculated" id="r-method">
        <div className="space-y-2 text-[12px] leading-relaxed text-slate-700">
          <p>
            <strong>Project %</strong> is the average of every floor&apos;s %, each floor counting equally. Floors
            with no recorded work count as 0%.
          </p>
          <p>
            <strong>Floor %:</strong> on a floor with zones, each zone&apos;s % is the sum of each trade&apos;s stage
            credit × its weight, and zones are combined by{" "}
            {zones?.basis === "equal" ? "equal share" : "floor area"}. Trades marked N/A are left out and the rest
            re-weighted. On a floor without zones, the % is checklist steps ended ÷ total steps.
          </p>
          <p>
            <strong>Planned %</strong> rises evenly from 0% on the planned start to 100% on the planned end (per
            trade on zoned floors, per checklist schedule otherwise). Floors without a schedule are left out of
            planned %, variance and status.
          </p>
          <p>
            <strong>Variance</strong> = actual − planned, in points. <strong>Status:</strong> On track when actual ≥
            planned; otherwise behind by (planned − actual) ÷ planned, shown as under or over 20%.
          </p>
          <p>
            <strong>Verification:</strong>{" "}
            {report.verifiedOnly
              ? "this project counts only work a Client Admin or BuildView has verified."
              : "work counts when recorded; verification is shown alongside each change."}{" "}
            Linked 360 scans are the evidence for a change.
          </p>
        </div>
        {zones ? (
          <div className="report-row report-two mt-4 grid gap-6 text-[12px] sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Trades and weights{zones.templateSource === "project" ? " (project template)" : ""}
              </p>
              <ul>
                {zones.activities.map((a) => (
                  <li key={a.key} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span>{a.name}</span>
                    <span className="tabular-nums">{Math.round(a.weight * 10) / 10}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stages and credit</p>
              <ul>
                {zones.stages.map((st) => (
                  <li key={st.key} className="flex justify-between border-b border-slate-100 py-0.5">
                    <span>{st.name}</span>
                    <span className="tabular-nums">{Math.round(st.credit)}%</span>
                  </li>
                ))}
              </ul>
              {zones.naRules.length > 0 ? (
                <p className="mt-2 text-slate-600">
                  N/A by default:{" "}
                  {Object.entries(
                    zones.naRules.reduce<Record<string, string[]>>((acc, r) => {
                      const name = zones.activities.find((a) => a.key === r.activityKey)?.name;
                      if (name) (acc[r.zoneType] ??= []).push(name);
                      return acc;
                    }, {})
                  )
                    .map(([type, names]) => `${ZONE_TYPE_LABELS[type] ?? type}: ${names.join(", ")}`)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Section>

      <footer className="mt-10 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
        {report.project.name} · Progress report {fmtDay(report.from)} – {fmtDay(report.to)} · Generated by BuildView on{" "}
        {fmtDay(report.generatedOn)}
      </footer>
    </article>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-display tabular-nums ${strong ? "text-3xl font-bold" : "text-xl font-semibold text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}

function HeatLegend() {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600" aria-label="Zone colour key">
      {HEAT_LEGEND.map((p) => {
        const h = heatFill(p);
        return (
          <li key={h.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded-sm border border-slate-300" style={{ background: h.fill }} aria-hidden />
            {h.label}
          </li>
        );
      })}
    </ul>
  );
}

type Zones = NonNullable<ProgressReport["zones"]>;

function ZoneMatrix({ floor, zones }: { floor: Zones["floors"][number]; zones: Zones }) {
  const stageName = new Map(zones.stages.map((s) => [s.key, s.name]));
  return (
    <table className="w-full min-w-[560px] border-collapse text-[11px]">
      <thead>
        <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
          <th scope="col" className="py-1 pr-2 font-semibold">Zone</th>
          {zones.activities.map((a) => (
            <th key={a.key} scope="col" className="py-1 pr-2 font-semibold">
              {a.name}
            </th>
          ))}
          <th scope="col" className="py-1 text-right font-semibold">Zone %</th>
        </tr>
      </thead>
      <tbody>
        {floor.zones.map((z) => (
          <tr key={z.id} className="report-row border-b border-slate-100">
            <th scope="row" className="py-1 pr-2 text-left font-medium">
              {z.name}
              <span className="block text-[10px] font-normal text-slate-500">
                {ZONE_TYPE_LABELS[z.zoneType] ?? z.zoneType}
                {z.area ? ` · ${Math.round(z.area)} sq ft` : ""}
              </span>
            </th>
            {zones.activities.map((a) => {
              const cell = z.cells[a.key];
              if (!cell || cell.percent == null) {
                return (
                  <td key={a.key} className="py-1 pr-2 text-slate-400">
                    N/A
                  </td>
                );
              }
              const counted = cell.countedStageKey ? stageName.get(cell.countedStageKey) : null;
              const pending = cell.latestStatus === "pending" && cell.latestStageKey !== cell.countedStageKey;
              return (
                <td key={a.key} className="py-1 pr-2">
                  {counted ?? "Not started"}
                  {pending && cell.latestStageKey ? (
                    <span className="block text-[10px] text-amber-700">
                      {stageName.get(cell.latestStageKey)} awaiting review
                    </span>
                  ) : null}
                </td>
              );
            })}
            <td className="py-1 text-right font-semibold tabular-nums">{formatPercent(z.percent)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CHANGE_STATUS: Record<ReportChange["status"], { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "text-emerald-800" },
  rejected: { label: "Rejected", cls: "text-red-700" },
  pending: { label: "Not verified", cls: "text-amber-800" },
};

function ChangesTable({ changes }: { changes: ReportChange[] }) {
  return (
    <table className="w-full min-w-[560px] border-collapse text-[11px]">
      <thead>
        <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
          <th scope="col" className="py-1 pr-2 font-semibold">Date</th>
          <th scope="col" className="py-1 pr-2 font-semibold">Where</th>
          <th scope="col" className="py-1 pr-2 font-semibold">What</th>
          <th scope="col" className="py-1 pr-2 font-semibold">Verification</th>
          <th scope="col" className="py-1 font-semibold">Evidence</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c, i) => (
          <tr key={`${c.date}-${i}`} className="report-row border-b border-slate-100 align-top">
            <td className="whitespace-nowrap py-1 pr-2 tabular-nums">{fmtDay(c.date)}</td>
            <td className="py-1 pr-2">{c.where}</td>
            <td className="py-1 pr-2">{c.what}</td>
            <td className={`py-1 pr-2 font-medium ${CHANGE_STATUS[c.status].cls}`}>{CHANGE_STATUS[c.status].label}</td>
            <td className="py-1">
              {c.evidence ? (
                <a href={c.evidence.url} className="text-blue-700 underline underline-offset-2">
                  360 scan{c.evidence.date ? ` ${fmtDay(c.evidence.date)}` : ""}
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Static S-curve: actual (solid) and planned (dashed) on one 0–100% axis. */
function SCurve({ report }: { report: ProgressReport }) {
  const W = 720;
  const H = 230;
  const pad = { l: 40, r: 14, t: 12, b: 28 };
  const points = report.history;
  const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const t0 = toMs(points[0].date);
  const t1 = Math.max(t0 + 1, toMs(points[points.length - 1].date));
  const x = (d: string) => pad.l + ((toMs(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const line = (key: "actual" | "planned") =>
    points
      .filter((p) => p[key] != null)
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p[key] as number).toFixed(1)}`)
      .join(" ");
  const actualPath = line("actual");
  const plannedPath = line("planned");
  const today = report.generatedOn;
  const showToday = toMs(today) >= t0 && toMs(today) <= t1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => new Date(t0 + f * (t1 - t0)).toISOString().slice(0, 10));

  return (
    <figure className="report-row">
      <div className="mb-2 flex gap-5 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" y1="3" x2="22" y2="3" stroke={ACTUAL} strokeWidth="2.5" />
          </svg>
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" y1="3" x2="22" y2="3" stroke={PLANNED} strokeWidth="2" strokeDasharray="5 3" />
          </svg>
          Planned
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Planned and actual completion over time">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#64748b">
              {v}%
            </text>
          </g>
        ))}
        {ticks.map((d, i) => (
          <text
            key={d + i}
            x={x(d)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="#64748b"
          >
            {fmtDay(d)}
          </text>
        ))}
        {showToday ? (
          <g>
            <line x1={x(today)} x2={x(today)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeDasharray="2 3" />
            <text x={x(today) + 4} y={pad.t + 9} fontSize="10" fill="#64748b">
              Today
            </text>
          </g>
        ) : null}
        {plannedPath ? (
          <path d={plannedPath} fill="none" stroke={PLANNED} strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" />
        ) : null}
        {actualPath ? <path d={actualPath} fill="none" stroke={ACTUAL} strokeWidth="2.5" strokeLinejoin="round" /> : null}
      </svg>
    </figure>
  );
}
