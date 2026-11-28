"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getWebsiteAnalytics, type WebsiteAnalyticsView } from "@/lib/actions/traffic-analytics";
import { toCsv } from "@/lib/analytics/aggregate";
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
} from "@/components/admin/analytics/traffic-ui";

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/construction-intelligence": "Construction Intelligence",
  "/interior-showcase": "Interior Showcase",
  "/real-estate-showcase": "Real Estate Showcase",
  "/projects": "Projects",
  "/services": "Services",
  "/about": "About",
  "/contact": "Contact",
};
const pageName = (p: string) => PAGE_NAMES[p] ?? p;

/** Landing-page visitors: first-party, anonymous, staff only. */
export function WebsiteAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [view, setView] = useState<WebsiteAnalyticsView | null>(null);

  useEffect(() => {
    let cancelled = false;
    setView(null);
    getWebsiteAnalytics(rangeFor(days)).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  function exportCsv() {
    if (!view?.ok) return;
    const { from, to } = rangeFor(days);
    const lines = [
      toCsv(["Day", "Visitors", "Conversions"], view.daily.map((d) => [d.date, d.visitors, d.conversions])),
      "",
      toCsv(["Page", "Views", "Avg engaged time (s)"], view.topPages.map((p) => [pageName(p.path), p.views, p.avgSeconds == null ? "" : Math.round(p.avgSeconds)])),
      "",
      toCsv(["Source", "Visits", "Conversions"], view.sources.map((s) => [s.source, s.visits, s.conversions])),
      "",
      toCsv(["Campaign", "Source", "Visits", "Conversions"], view.campaigns.map((c) => [c.campaign, c.source, c.visits, c.conversions])),
    ];
    downloadCsv(`website-analytics-${from}-to-${to}.csv`, lines.join("\r\n"));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeSelect days={days} onChange={setDays} />
        <div className="flex items-center gap-3">
          {view?.ok ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="tabular-nums">{view.liveVisitors}</span> on the site in the last 30 min
            </span>
          ) : null}
          {view?.ok ? <CsvButton onClick={exportCsv} /> : null}
        </div>
      </div>

      {!view ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading website analytics…
        </div>
      ) : !view.ok ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {view.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Visitors" value={String(view.totals.visitors)} change={view.change.visitors} />
            <StatTile label="Visits" value={String(view.totals.visits)} change={view.change.visits} />
            <StatTile label="Page views" value={String(view.totals.pageViews)} hint={`${formatPct(view.totals.returningShare)} returning visits`} />
            <StatTile label="Leads" value={String(view.totals.conversions)} change={view.change.conversions} />
            <StatTile label="Avg engaged time" value={formatDuration(view.totals.avgSeconds)} hint={`${formatPct(view.totals.conversionRate)} of visits became leads`} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Visitors and leads per day</h3>
            <TrendChart data={view.daily} blueKey="visitors" blueLabel="Visitors" greenKey="conversions" greenLabel="Leads" ariaLabel="Website visitors and leads per day" />
          </section>

          <div className="grid gap-3 lg:grid-cols-3">
            <RankList
              title="Top pages"
              rows={view.topPages.map((p) => ({ label: pageName(p.path), count: p.views, extra: formatDuration(p.avgSeconds) }))}
            />
            <RankList
              title="Where visitors came from"
              rows={view.sources.map((s) => ({ label: s.source, count: s.visits, extra: s.conversions ? `${s.conversions} leads` : undefined }))}
            />
            <RankList title="Leads by type" rows={view.conversionsByType.filter((c) => c.count > 0)} empty="No leads in this period." />
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <RankList
              title="Campaigns (UTM)"
              rows={view.campaigns.map((c) => ({ label: `${c.campaign} · ${c.source}`, count: c.visits, extra: c.conversions ? `${c.conversions} leads` : undefined }))}
              empty="Add ?utm_source=instagram&utm_campaign=… to your post and ad links to see them here."
            />
            <RankList title="Landing pages" rows={view.entryPages.map((e) => ({ label: pageName(e.label), count: e.count }))} />
            <RankList title="Devices" rows={view.devices} />
            <RankList title="Countries" rows={view.countries} />
          </div>

          <p className="text-xs text-slate-500">
            Counted on the live site only: bots, link previews and signed-in BuildView staff are left out. Visitors who decline
            cookies are counted per session without being remembered. Leads = contact form, book a demo, sign up and WhatsApp clicks.
          </p>
        </>
      )}
    </div>
  );
}
