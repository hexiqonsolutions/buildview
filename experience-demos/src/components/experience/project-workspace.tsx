"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileText,
  FolderOpen,
  MapPin,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DemoProject } from "@/fixtures/types";
import { formatDate, formatRelativeTime, formatStatus, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CONSTRUCTION_TABS = [
  "overview",
  "scans",
  "photos",
  "timeline",
  "progression",
  "reports",
  "documents",
  "issues",
] as const;

const PORTFOLIO_TABS = ["overview", "walkthroughs", "media"] as const;

export function ProjectWorkspace({
  project,
  mode,
  backHref,
  compareHref,
  initialTab,
}: {
  project: DemoProject;
  mode: "construction" | "portfolio";
  backHref: string;
  compareHref?: string;
  initialTab?: string;
}) {
  const tabs = mode === "construction" ? CONSTRUCTION_TABS : PORTFOLIO_TABS;
  const defaultTab =
    initialTab && (tabs as readonly string[]).includes(initialTab)
      ? initialTab
      : tabs[0];
  const [tab, setTab] = useState(defaultTab);
  const [activeTourId, setActiveTourId] = useState(project.tours[0]?.id);
  const activeTour = useMemo(
    () => project.tours.find((t) => t.id === activeTourId) ?? project.tours[0],
    [project.tours, activeTourId]
  );

  const photos = project.timeline.flatMap((e) => e.photo_urls);
  const walkthroughLabel = mode === "portfolio" ? "Walkthroughs" : "Scans";

  return (
    <div className="dashboard-page">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="dashboard-ghost-link">
          <Link href={backHref}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
        {compareHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={compareHref}>Compare early vs handover</Link>
          </Button>
        )}
      </div>

      <header className="intel-card overflow-hidden">
        <div className="relative h-40 sm:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_image_url}
            alt={project.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(project.status)}`}>
                {formatStatus(project.status)}
              </span>
              {project.portfolio_category && (
                <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {project.portfolio_category.replace("_", " ")}
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              {project.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {project.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.start_date)}
                {project.completion_date ? ` → ${formatDate(project.completion_date)}` : ""}
              </span>
              {project.area_sqft ? (
                <span>{project.area_sqft.toLocaleString()} sq ft</span>
              ) : null}
            </p>
          </div>
        </div>
        <p className="px-4 py-3 text-sm text-slate-600 sm:px-5">{project.description}</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="dashboard-tabs-list w-full justify-start overflow-x-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="dashboard-tabs-trigger capitalize">
              {t === "scans" || t === "walkthroughs" ? walkthroughLabel : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: mode === "portfolio" ? "Walkthroughs" : "Scans", value: project.tourCount },
              { label: "Progress", value: `${project.progress}%` },
              { label: "Reports", value: project.reports.length },
              { label: "Open issues", value: project.issues.filter((i) => i.status === "open").length },
            ].map((kpi) => (
              <div key={kpi.label} className="intel-card p-4">
                <p className="dashboard-metric-label">{kpi.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{kpi.value}</p>
              </div>
            ))}
          </div>

          {mode === "construction" && (
            <>
              <section className="intel-card p-4 sm:p-5">
                <p className="dashboard-section-eyebrow">Team discussion</p>
                <h3 className="mt-1 font-semibold text-slate-900">Proxy conversation timeline</h3>
                <div className="mt-4 space-y-4">
                  {project.comments.map((c) => (
                    <article key={c.id} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{c.author}</p>
                        <Badge variant="secondary" className="text-[10px]">{c.role}</Badge>
                        <span className="text-[11px] text-slate-400">{formatRelativeTime(c.created_at)}</span>
                        <span className="text-[11px] text-slate-400">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{c.message}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {c.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {c.replies.length} replies
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                      </div>
                      {c.replies.length > 0 && (
                        <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                          {c.replies.map((r) => (
                            <div key={r.id}>
                              <p className="text-xs font-semibold text-slate-800">
                                {r.author}{" "}
                                <span className="font-normal text-slate-400">· {formatDate(r.created_at)}</span>
                              </p>
                              <p className="text-sm text-slate-600">{r.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {mode === "portfolio" && activeTour && (
            <div className="intel-card overflow-hidden p-3 sm:p-4">
              <MatterportViewer url={activeTour.matterport_url} title={activeTour.name} />
            </div>
          )}
        </TabsContent>

        <TabsContent value={mode === "portfolio" ? "walkthroughs" : "scans"} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.tours.map((tour) => (
              <button
                key={tour.id}
                type="button"
                onClick={() => setActiveTourId(tour.id)}
                className={cn(
                  "intel-card overflow-hidden text-left transition",
                  activeTour?.id === tour.id && "ring-2 ring-slate-900"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tour.thumbnail_url} alt="" className="aspect-video w-full object-cover bg-slate-200" />
                <div className="p-3">
                  <p className="text-sm font-semibold text-slate-900">{tour.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDate(tour.capture_date)} · {tour.building} / {tour.floor}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {activeTour && (
            <div className="intel-card overflow-hidden p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{activeTour.name}</h3>
                  <p className="text-xs text-slate-500">{activeTour.description}</p>
                </div>
                {compareHref && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={compareHref}>Open compare</Link>
                  </Button>
                )}
              </div>
              <MatterportViewer url={activeTour.matterport_url} title={activeTour.name} />
            </div>
          )}
        </TabsContent>

        {mode === "construction" && (
          <>
            <TabsContent value="photos" className="mt-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt={`Site photo ${i + 1}`}
                    className="aspect-4/3 rounded-xl object-cover"
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4 space-y-3">
              {project.timeline.map((event) => (
                <article key={event.id} className="intel-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    <span className="text-xs text-slate-500">{formatDate(event.date)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{event.progress_note}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>{event.author}</span>
                    <span>·</span>
                    <span>
                      {event.building} / {event.floor}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-slate-800">{event.progress_percent}% overall</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(event.trades).map(([trade, pct]) => (
                      <span
                        key={trade}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      >
                        {trade} {pct}%
                      </span>
                    ))}
                  </div>
                  {event.photo_urls.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {event.photo_urls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" className="h-20 w-28 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </TabsContent>

            <TabsContent value="progression" className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Overall", value: project.progression.overall_percent },
                  { label: "Pre-slab", value: project.progression.pre_slab_percent },
                  { label: "Post-slab", value: project.progression.post_slab_percent },
                ].map((item) => (
                  <div key={item.label} className="intel-card p-4">
                    <p className="dashboard-metric-label">{item.label}</p>
                    <p className="mt-1 font-display text-3xl font-semibold">{item.value}%</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Floors complete: {project.progression.floors_complete}/{project.progression.floors_total}
              </p>
              <div className="space-y-3">
                {project.progression.phases.map((phase) => {
                  const done = phase.steps.filter((s) => s.status === "completed").length;
                  const pct = Math.round((done / phase.steps.length) * 100);
                  return (
                    <div key={phase.id} className="intel-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-900">{phase.name}</h4>
                        <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {done}/{phase.steps.length} steps completed
                      </p>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-4 space-y-2">
              {project.reports.map((r) => (
                <div key={r.id} className="dashboard-list-row flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="text-[11px] text-slate-500">{r.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(r.date)}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-2">
              {project.documents.map((d) => (
                <div key={d.id} className="dashboard-list-row flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{d.name}</p>
                      <p className="text-[11px] text-slate-500">{d.folder}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(d.updated_at)}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="issues" className="mt-4 space-y-3">
              {project.issues.map((issue) => (
                <article key={issue.id} className="intel-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(issue.priority)}`}>
                      {formatStatus(issue.priority)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(issue.status)}`}>
                      {formatStatus(issue.status)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDate(issue.created_at)}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900">{issue.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{issue.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {issue.location} · {issue.assignee}
                    {issue.resolved_at ? ` · resolved ${formatDate(issue.resolved_at)}` : ""}
                  </p>
                  {issue.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={issue.image_url} alt="" className="mt-3 h-32 w-full rounded-lg object-cover sm:w-56" />
                  )}
                </article>
              ))}
            </TabsContent>
          </>
        )}

        {mode === "portfolio" && (
          <TabsContent value="media" className="mt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {project.media.map((item) => (
                <figure key={item.id} className="intel-card overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.title} className="aspect-4/3 w-full object-cover" />
                  <figcaption className="p-2 text-xs text-slate-600">{item.title}</figcaption>
                </figure>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
