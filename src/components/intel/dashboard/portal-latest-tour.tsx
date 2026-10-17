"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Columns2, Rotate3d } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getMatterportThumbnailUrl } from "@/lib/matterport";
import type { ProjectTour } from "@/lib/types";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

type LatestTour = ProjectTour & { projectName: string; projectId: string };

/**
 * Compact latest-walkthrough card for Construction Intelligence.
 * No Matterport embed, no h-full — keeps the dashboard from stretching.
 */
export function PortalLatestTourCard({ tour }: { tour: LatestTour | null }) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";
  const projectsHref = `/dashboard/projects${workspaceQuery}`;
  const [failed, setFailed] = useState(0);

  const candidates = tour
    ? [
        tour.thumbnail_url,
        tour.matterport_url ? getMatterportThumbnailUrl(tour.matterport_url) : null,
      ].filter((src, i, all): src is string => Boolean(src) && all.indexOf(src) === i)
    : [];
  const thumbnail = candidates[failed] ?? null;

  if (!tour) {
    return (
      <section className="intel-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="dashboard-section-eyebrow">Latest walkthrough</p>
            <h2 className="dashboard-section-title mt-0.5">Virtual tour</h2>
          </div>
          <Button variant="ghost" size="sm" className="dashboard-ghost-link shrink-0" asChild>
            <Link href={projectsHref}>View all</Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Camera className="mb-2 h-8 w-8 text-slate-300" aria-hidden />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No walkthroughs yet</p>
          <p className="mt-1 max-w-[16rem] text-xs text-slate-500">
            The newest 3D site visit will show here once BuildView uploads a scan.
          </p>
        </div>
      </section>
    );
  }

  const scansQuery = new URLSearchParams(
    workspaceQuery.startsWith("?") ? workspaceQuery.slice(1) : workspaceQuery
  );
  scansQuery.set("tab", "scans");
  const projectHref = `/dashboard/projects/${tour.projectId}${workspaceQuery}`;
  const viewAllScansHref = `/dashboard/projects/${tour.projectId}?${scansQuery.toString()}`;
  const compareHref = `/dashboard/matterport-comparison?project=${tour.projectId}&scanA=${tour.id}${
    workspaceQuery ? `&${workspaceQuery.slice(1)}` : ""
  }`;

  return (
    <section className="intel-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="min-w-0">
          <p className="dashboard-section-eyebrow">Latest walkthrough</p>
          <h2 className="dashboard-section-title mt-0.5 truncate">{tour.name}</h2>
        </div>
        <Button variant="ghost" size="sm" className="dashboard-ghost-link shrink-0" asChild>
          <Link href={viewAllScansHref}>
            View all
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      <Link
        href={projectHref}
        className="group relative block aspect-video overflow-hidden bg-slate-900"
        aria-label={`Open ${tour.name} on ${tour.projectName}`}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={thumbnail}
            src={thumbnail}
            alt=""
            loading="lazy"
            onError={() => setFailed((n) => n + 1)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-800 via-slate-900 to-black">
            <Rotate3d className="h-8 w-8 text-slate-400" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              360° walkthrough
            </span>
          </div>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/55 to-transparent" />
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          <Rotate3d className="h-3 w-3" aria-hidden />
          Latest scan
        </span>
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {tour.projectName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {tour.capture_date ? formatDate(tour.capture_date) : "Date not set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            asChild
          >
            <Link href={projectHref}>Open project</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={compareHref}>
              <Columns2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Compare
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
