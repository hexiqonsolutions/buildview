"use client";

import Link from "next/link";
import { MapPin, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { UpdateProjectStatusSelect } from "@/components/shared/update-project-status-select";
import { formatDate } from "@/lib/utils";
import type { ProjectWithMeta } from "@/lib/actions/data";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

export function PortalProjectCard({
  project,
  workspaceQuery = "",
  canUpdateStatus = false,
}: {
  project: ProjectWithMeta;
  workspaceQuery?: string;
  canUpdateStatus?: boolean;
}) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolio = portal?.dashboardType === "portfolio";
  const openHref = `/dashboard/projects/${project.id}${workspaceQuery}`;
  const tour = project.latestTour;

  const statusControl = canUpdateStatus ? (
    <div className="absolute right-3 top-3 z-10">
      <UpdateProjectStatusSelect
        projectId={project.id}
        currentStatus={project.status}
        triggerClassName="h-7 w-[7.75rem] bg-white/95 text-[11px] shadow-sm backdrop-blur dark:bg-slate-950/90"
      />
    </div>
  ) : null;

  return (
    <article className="intel-card dashboard-card-hover group overflow-hidden">
      {tour?.matterport_url ? (
        <div className="relative border-b border-slate-100/80 dark:border-slate-800/80">
          <MatterportViewer
            url={tour.matterport_url}
            title={tour.name || project.name}
            aspectRatio
            showToolbar={false}
            className="rounded-none"
          />
          {statusControl}
        </div>
      ) : (
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
          {project.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
              <span className="font-display text-5xl font-bold text-white/15">
                {project.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
          {statusControl}
        </div>
      )}

      <div className="p-4 sm:p-5">
        <h3 className="truncate font-display text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {project.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{project.location || "Location TBD"}</span>
        </p>

        {!isPortfolio && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{project.stage}</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                {project.progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-800 transition-all duration-500 dark:bg-slate-200"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Camera className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {tour
              ? `${project.tourCount ?? 1} walkthrough${(project.tourCount ?? 1) === 1 ? "" : "s"}`
              : "No virtual tour yet"}
            {project.latestScanDate ? ` · ${formatDate(project.latestScanDate)}` : ""}
          </span>
        </p>

        <Button
          variant="default"
          size="sm"
          className="mt-4 w-full bg-slate-900 text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          asChild
        >
          <Link href={openHref}>
            {isPortfolio ? "View project" : "Open Project"}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
