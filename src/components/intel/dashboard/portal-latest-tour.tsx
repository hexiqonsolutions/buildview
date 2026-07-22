"use client";

import Link from "next/link";
import { Columns2, ExternalLink, Camera } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { ProjectTour } from "@/lib/types";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

type LatestTour = ProjectTour & { projectName: string; projectId: string };

export function PortalLatestTourCard({ tour }: { tour: LatestTour | null }) {
  const { hydrated, scope } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";

  if (!tour) {
    return (
      <div className="intel-card flex flex-col items-center justify-center p-10 text-center">
        <Camera className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-900 dark:text-white">No Matterport scans yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Your latest 3D site visit will appear here once uploaded by BuildView.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/dashboard/projects${workspaceQuery}`}>Browse projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="intel-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Latest Matterport Tour
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
            {tour.name}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {tour.projectName}
            {tour.capture_date && ` · ${formatDate(tour.capture_date)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${tour.projectId}`}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open project
            </Link>
          </Button>
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800" asChild>
            <Link
              href={`/dashboard/matterport-comparison?project=${tour.projectId}&scanA=${tour.id}${workspaceQuery ? `&${workspaceQuery.slice(1)}` : ""}`}
            >
              <Columns2 className="mr-1.5 h-4 w-4" />
              Compare
            </Link>
          </Button>
        </div>
      </div>
      <MatterportViewer
        url={tour.matterport_url}
        title={tour.name}
        aspectRatio
        showToolbar
        className="rounded-none"
      />
    </div>
  );
}
