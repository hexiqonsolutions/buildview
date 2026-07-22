"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Camera,
  MoreHorizontal,
  Columns2,
  Eye,
  Archive,
  Copy,
  Trash2,
} from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { PreviewTourDialog } from "@/components/admin/preview-tour-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterToursByScope,
  parseTourWorkspaceMeta,
} from "@/lib/admin/tour-metadata";
import { formatDate } from "@/lib/utils";
import type { ProjectTour } from "@/lib/types";

type TourRow = ProjectTour & { project?: { id: string; name: string } | null };

export function MatterportManager({ tours }: { tours: TourRow[] }) {
  const { hydrated, scope, clientProjects, project } = useAdminWorkspace();

  const filtered = useMemo(() => {
    const ids = new Set(clientProjects.map((p) => p.id));
    return filterToursByScope(tours, scope, ids);
  }, [tours, scope, clientProjects]);

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {filtered.length} tour{filtered.length === 1 ? "" : "s"}
        {project ? ` for ${project.name}` : scope.clientId ? " in workspace" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="ops-card flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
          <Camera className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-900 dark:text-white">No tours in this workspace</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Use Upload in the header, or Quick add → Matterport, to add a scan.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tour) => {
            const meta = parseTourWorkspaceMeta(tour.description);
            const buildingLabel = meta.building ?? null;
            const floorLabel = meta.floor ?? null;

            return (
              <article
                key={tour.id}
                className="ops-card group overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                  {tour.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tour.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Camera className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-white/90 shadow-sm"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <PreviewTourDialog
                            name={tour.name}
                            matterportUrl={tour.matterport_url}
                            trigger={
                              <span className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm">
                                <Eye className="mr-2 h-4 w-4" /> Preview
                              </span>
                            }
                          />
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/compare?scanA=${tour.id}&project=${tour.project_id}`}>
                            <Columns2 className="mr-2 h-4 w-4" /> Compare
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" /> Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-slate-900 dark:text-white">
                        {tour.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {tour.project?.name ?? "Project"}
                        {tour.capture_date ? ` · ${formatDate(tour.capture_date)}` : ""}
                      </p>
                    </div>
                    <PreviewTourDialog
                      name={tour.name}
                      matterportUrl={tour.matterport_url}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>

                  {(buildingLabel || floorLabel) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {buildingLabel && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {buildingLabel}
                        </Badge>
                      )}
                      {floorLabel && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {floorLabel}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
