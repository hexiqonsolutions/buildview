"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getLinkAnalytics,
  getLinkDetail,
  type LinkAnalyticsView,
  type LinkDetailView,
  type LinkRow,
} from "@/lib/actions/traffic-analytics";
import { toCsv } from "@/lib/analytics/aggregate";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CsvButton,
  RangeSelect,
  RankList,
  StatTile,
  TrendChart,
  downloadCsv,
  formatDuration,
  formatPct,
  rangeFor,
  relativeTime,
} from "@/components/admin/analytics/traffic-ui";

const STATUS_TONE: Record<LinkRow["status"], string> = {
  active: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  revoked: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

/** Opens, unique visitors, unlocks and time in tour for every shared 360 link. */
export function LinkAnalyticsPanel({ projects }: { projects: { id: string; name: string }[] }) {
  const [days, setDays] = useState(30);
  const [projectId, setProjectId] = useState("");
  const [view, setView] = useState<LinkAnalyticsView | null>(null);
  const [detail, setDetail] = useState<LinkRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    getLinkAnalytics({ ...rangeFor(days), projectId: projectId || null }).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, [days, projectId]);

  function exportCsv() {
    if (!view?.ok) return;
    const { from, to } = rangeFor(days);
    downloadCsv(
      `link-analytics-${from}-to-${to}.csv`,
      toCsv(
        ["Tour", "Project", "Status", "Created by", "Created", "Expires", "Opens", "Unique visitors", "Unlocked", "Unlock rate %", "Avg time in tour (s)", "Returning", "Link previews", "Last opened"],
        view.links.map((l) => [
          l.tourName,
          l.projectName,
          l.status,
          l.createdByName,
          l.createdAt.slice(0, 10),
          l.expiresAt.slice(0, 10),
          l.opens,
          l.unique,
          l.unlocked,
          l.unlockRate == null ? "" : Math.round(l.unlockRate),
          l.avgSeconds == null ? "" : Math.round(l.avgSeconds),
          l.returning,
          l.previews,
          l.lastOpened ?? "",
        ])
      )
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <RangeSelect days={days} onChange={setDays} />
          <select
            aria-label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {view?.ok ? <CsvButton onClick={exportCsv} /> : null}
      </div>

      {!view ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading link analytics…
        </div>
      ) : !view.ok ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {view.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Opens" value={String(view.totals.opens)} hint={`${view.totals.previews} link previews not counted`} />
            <StatTile label="Unique visitors" value={String(view.totals.unique)} hint={`${view.totals.returning} came back`} />
            <StatTile label="Unlocked" value={String(view.totals.unlocked)} hint="Filled the form and saw the tour" />
            <StatTile label="Unlock rate" value={formatPct(view.totals.unlockRate)} hint="Unlocked ÷ unique visitors" />
            <StatTile label="Avg time in tour" value={formatDuration(view.totals.avgSeconds)} hint="While the tour was on screen" />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Opens and unlocks per day</h3>
            <TrendChart data={view.daily} blueKey="opens" blueLabel="Opens" greenKey="unlocked" greenLabel="Unlocked" ariaLabel="Opens and unlocks per day" />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Link</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Opens</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Unique</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Unlocked</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Rate</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Avg time</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Last opened</th>
                  </tr>
                </thead>
                <tbody>
                  {view.links.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No shared links with activity in this period. Opens are counted from the day this was switched on.
                      </td>
                    </tr>
                  ) : (
                    view.links.map((l) => (
                      <tr key={l.shareId} className="border-t border-slate-100 dark:border-slate-800">
                        <th scope="row" className="px-4 py-2.5 text-left font-normal">
                          <button
                            type="button"
                            onClick={() => setDetail(l)}
                            className="text-left font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
                          >
                            {l.tourName}
                          </button>
                          <span className="block text-xs text-slate-500">
                            {l.projectName}
                            {l.createdByName ? ` · shared by ${l.createdByName}` : ""} ·{" "}
                            <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", STATUS_TONE[l.status])}>{l.status}</span>
                          </span>
                        </th>
                        <td className="px-3 py-2.5 text-right tabular-nums">{l.opens}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{l.unique}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{l.unlocked}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatPct(l.unlockRate)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatDuration(l.avgSeconds)}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{relativeTime(l.lastOpened)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {view.previewSources.length > 0 ? (
            <p className="text-xs text-slate-500">
              Link previews (not counted as opens):{" "}
              {view.previewSources.map((p) => `${p.label} ${p.count}`).join(" · ")}
            </p>
          ) : null}
        </>
      )}

      <LinkDetailDialog link={detail} days={days} onClose={() => setDetail(null)} />
    </div>
  );
}

function LinkDetailDialog({ link, days, onClose }: { link: LinkRow | null; days: number; onClose: () => void }) {
  const [detail, setDetail] = useState<LinkDetailView | null>(null);
  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    setDetail(null);
    getLinkDetail({ ...rangeFor(days), shareId: link.shareId }).then((d) => {
      if (!cancelled) setDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [link, days]);
  const ready = detail?.ok ? detail : null;
  const title = useMemo(() => (link ? `${link.tourName} · ${link.projectName}` : ""), [link]);

  return (
    <Dialog open={Boolean(link)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {link ? `Shared ${formatDate(link.createdAt)} · expires ${formatDate(link.expiresAt)} · last ${days} days` : ""}
          </DialogDescription>
        </DialogHeader>
        {!detail ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
          </div>
        ) : !ready ? (
          <p className="text-sm text-red-600">{detail.ok ? null : detail.error}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Opens" value={String(ready.stats.opens)} />
              <StatTile label="Unique" value={String(ready.stats.unique)} />
              <StatTile label="Unlocked" value={String(ready.stats.unlocked)} />
              <StatTile label="Avg time" value={formatDuration(ready.stats.avgSeconds)} />
            </div>
            <TrendChart data={ready.daily} blueKey="opens" blueLabel="Opens" greenKey="unlocked" greenLabel="Unlocked" ariaLabel="Opens and unlocks per day for this link" />
            <div className="grid gap-3 sm:grid-cols-3">
              <RankList title="Devices" rows={ready.devices} />
              <RankList title="Countries" rows={ready.countries} />
              <RankList title="Came from" rows={ready.referrers} />
            </div>
            {ready.viewers ? (
              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">People who unlocked</h4>
                {ready.viewers.length === 0 ? (
                  <p className="text-sm text-slate-500">Nobody has unlocked this link in this period.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/60">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">Name</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Contact</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Visits</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Time in tour</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Last seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ready.viewers.map((v) => (
                          <tr key={`${v.email}-${v.name}`} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2">{v.name}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{[v.phone, v.email].filter(Boolean).join(" · ")}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{v.visits}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatDuration(v.seconds)}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{relativeTime(v.lastSeen)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
