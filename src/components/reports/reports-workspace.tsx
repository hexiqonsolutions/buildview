"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReportsData } from "@/lib/reports/queries";
import {
  REPORT_RANGES,
  money,
  type ReportRange,
} from "@/lib/reports/schema";
import { Button } from "@/components/ui/button";
import { ReportsPipeline } from "@/components/reports/reports-pipeline";
import { ReportsActivityChart } from "@/components/reports/reports-activity-chart";
import { ReportsTrendChart } from "@/components/reports/reports-trend-chart";
import { cn } from "@/lib/utils";

type ReportsWorkspaceProps = {
  data: ReportsData;
};

const RANGE_LABELS: Record<ReportRange, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  month: "This month",
  all: "All time",
};

const TONE_CLASS = {
  default: "border-zinc-800/80",
  warning: "border-amber-500/25",
  danger: "border-red-500/25",
  success: "border-emerald-500/25",
} as const;

export function ReportsWorkspace({ data }: ReportsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRange(range: ReportRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (range === "30d") params.delete("range");
    else params.set("range", range);
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
            Reports
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            Pipeline & conversion
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {data.rangeLabel} · win rate, activity mix, and source performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {REPORT_RANGES.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={data.range === range ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setRange(range)}
            >
              {RANGE_LABELS[range]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.kpis.map((kpi) => (
          <article
            key={kpi.id}
            className={cn(
              "rounded-2xl border bg-[#121212] px-4 py-4",
              TONE_CLASS[kpi.tone || "default"]
            )}
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {kpi.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-white">
              {kpi.value}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{kpi.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportsPipeline stages={data.pipeline} />
        <ReportsActivityChart data={data.activities} />
      </div>

      <ReportsTrendChart data={data.trend} rangeLabel={data.rangeLabel} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Lead sources
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Created in range · top sources
          </p>
          {data.sources.length === 0 ? (
            <p className="mt-8 text-center text-sm text-zinc-500">
              No source data in this range
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-800/80">
              {data.sources.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="truncate text-zinc-200">{row.source}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {row.count} leads · {row.won} won · {money(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Owner performance
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Current book · pipeline value by owner
          </p>
          {data.owners.length === 0 ? (
            <p className="mt-8 text-center text-sm text-zinc-500">
              No owner data yet
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-800/80">
              {data.owners.map((row) => (
                <li
                  key={row.ownerId || "unassigned"}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="truncate text-zinc-200">{row.ownerName}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {row.leads} leads · {row.won}W/{row.lost}L ·{" "}
                    {money(row.pipelineValue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
