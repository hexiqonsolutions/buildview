"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Validated series colours (same as the S-curve): blue = volume, green = outcome. */
export const SERIES_BLUE = "#2563eb";
export const SERIES_GREEN = "#4d7c0f";

export const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export function istToday(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export function rangeFor(days: number): { from: string; to: string } {
  const to = istToday();
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatPct(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RangeSelect({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
      {RANGES.map((r) => (
        <button
          key={r.days}
          type="button"
          role="radio"
          aria-checked={days === r.days}
          onClick={() => onChange(r.days)}
          className={cn(
            "min-h-9 rounded-md px-3 font-medium transition-colors",
            days === r.days ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, hint, change }: { label: string; value: string; hint?: string; change?: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {change !== undefined ? (
        <p className={cn("mt-0.5 text-xs tabular-nums", change == null ? "text-slate-500" : change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
          {change == null ? "new this period" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(change))}% vs previous`}
        </p>
      ) : hint ? (
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Two series over days: blue volume, green outcome. Hover shows exact values. */
export function TrendChart({
  data,
  blueKey,
  blueLabel,
  greenKey,
  greenLabel,
  ariaLabel,
}: {
  data: Record<string, string | number>[];
  blueKey: string;
  blueLabel: string;
  greenKey: string;
  greenLabel: string;
  ariaLabel: string;
}) {
  const short = (d: string) => {
    const [, m, day] = d.split("-");
    return `${Number(day)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}`;
  };
  return (
    <figure aria-label={ariaLabel} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={24} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            labelFormatter={(d) => short(String(d))}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey={blueKey} name={blueLabel} stroke={SERIES_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey={greenKey} name={greenLabel} stroke={SERIES_GREEN} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Ranked list with a proportional bar (one hue). */
export function RankList({ title, rows, empty = "No data yet." }: { title: string; rows: { label: string; count: number; extra?: string }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-300" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-900 dark:text-white">
                  {r.count}
                  {r.extra ? <span className="ml-1.5 text-xs text-slate-500">{r.extra}</span> : null}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: SERIES_BLUE }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CsvButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Download aria-hidden /> {label}
    </Button>
  );
}
