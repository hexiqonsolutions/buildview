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
 * Compact horizontal walkthrough strip — avoids tall side columns that stretch the grid.
 */
export function ConstructionLatestTourCard({ tour }: { tour: LatestTour | null }) {
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
      <section className="intel-card flex flex-col items-center justify-center px-4 py-8 text-center sm:px-5">
        <Camera className="mb-2 h-8 w-8 text-slate-300" aria-hidden />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No walkthroughs yet</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          The newest 3D site visit will show here once BuildView uploads a scan.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href={projectsHref}>Browse projects</Link>
        </Button>
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
      <div className="flex flex-col sm:flex-row">
        <Link
          href={projectHref}
          className="relative block aspect-video w-full shrink-0 overflow-hidden bg-slate-900 sm:aspect-auto sm:min-h-[10.5rem] sm:w-56 md:w-64 lg:w-72"
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
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-slate-800 via-slate-900 to-black">
              <Rotate3d className="h-7 w-7 text-slate-400" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                360° walkthrough
              </span>
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="dashboard-section-eyebrow">Latest walkthrough</p>
              <h2 className="dashboard-section-title mt-0.5 truncate">{tour.name}</h2>
              <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                {tour.projectName}
                <span className="text-slate-300 dark:text-slate-600"> · </span>
                {tour.capture_date ? formatDate(tour.capture_date) : "Date not set"}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="dashboard-ghost-link shrink-0" asChild>
              <Link href={viewAllScansHref}>
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              asChild
            >
              <Link href={projectHref}>Open project</Link>
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" asChild>
              <Link href={compareHref}>
                <Columns2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Compare
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
