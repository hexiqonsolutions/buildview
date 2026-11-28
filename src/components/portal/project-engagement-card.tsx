"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { getProjectEngagement, type LinkDetailView } from "@/lib/actions/traffic-analytics";
import { formatDuration, rangeFor, relativeTime } from "@/components/admin/analytics/traffic-ui";

/**
 * Client-facing engagement for shared tour links of this project (last 90 days).
 * Numbers for everyone with access; names and contacts for the Client Admin.
 * Hidden until the links have been opened.
 */
export function ProjectEngagementCard({ projectId }: { projectId: string }) {
  const [view, setView] = useState<LinkDetailView | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectEngagement({ ...rangeFor(90), projectId }).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!view?.ok || view.stats.opens === 0) return null;
  const { stats, viewers } = view;

  return (
    <section aria-labelledby="engagement-heading" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-slate-500" aria-hidden />
        <h2 id="engagement-heading" className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Who&apos;s viewing your 360 tour
        </h2>
        <span className="text-xs text-slate-500">· last 90 days</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Link opens", String(stats.opens)],
          ["People", String(stats.unique)],
          ["Viewed the tour", String(stats.unlocked)],
          ["Avg time in tour", formatDuration(stats.avgSeconds)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>
      {viewers && viewers.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent viewers</h3>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {viewers.slice(0, 8).map((v) => (
              <li key={`${v.email}-${v.name}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-slate-900 dark:text-white">{v.name}</span>
                  <span className="block text-xs text-slate-500">{[v.phone, v.email].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {formatDuration(v.seconds)} in tour · {relativeTime(v.lastSeen)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
