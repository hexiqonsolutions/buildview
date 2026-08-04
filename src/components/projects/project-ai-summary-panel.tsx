"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectAiSummary } from "@/lib/ai/project-summary-types";

function SummaryList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "risk";
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={`${title}-${i}`}
            className={
              tone === "risk"
                ? "text-xs text-rose-600 dark:text-rose-400"
                : "text-xs text-slate-500 dark:text-slate-400"
            }
          >
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectAiSummaryPanel({
  summary,
  compact = false,
}: {
  summary: ProjectAiSummary;
  compact?: boolean;
}) {
  const hasReports = summary.reportDigest.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-700 dark:text-slate-300" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Summary</h3>
          <Badge className="bg-slate-100 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            BETA
          </Badge>
          {hasReports ? (
            <span className="text-xs text-slate-400">
              {summary.reportDigest.length} report{summary.reportDigest.length === 1 ? "" : "s"}{" "}
              included
            </span>
          ) : null}
        </div>
        {!compact ? (
          <p className="mt-1 text-xs text-slate-500">
            Synthesized from all project reports, open issues, and recent timeline activity.
          </p>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {summary.overallProgress}
        </p>

        {hasReports ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              All reports
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {summary.reportDigest.map((report) => (
                <div key={report.id} className="px-3 py-2.5 sm:px-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {report.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">{report.date}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {report.typeLabel}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {report.excerpt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <SummaryList title="Recent report highlights" items={summary.keyChanges} />
        <SummaryList title="Pending / active" items={summary.pendingActivities} />
        <SummaryList title="Risks" items={summary.criticalRisks} tone="risk" />
        <SummaryList title="Recommended actions" items={summary.recommendedActions} />
      </div>
    </div>
  );
}
