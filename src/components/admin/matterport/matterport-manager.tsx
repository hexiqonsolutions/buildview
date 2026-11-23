"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Camera,
  MoreHorizontal,
  Columns2,
  Eye,
  Archive,
  ImagePlus,
  Share2,
  Trash2,
} from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import {
  PORTAL_ICONS,
  PORTAL_LENS_SHORT_LABELS,
  useAdminPortalLens,
} from "@/components/admin/workspace/admin-portal-lens";
import { isShowcaseDashboard, type ClientDashboardType } from "@/lib/portal/dashboard-type";
import { PreviewTourDialog } from "@/components/admin/preview-tour-dialog";
import { TourThumbnailDialog } from "@/components/admin/matterport/tour-thumbnail-dialog";
import { ShareTourDialog } from "@/components/share/share-tour-dialog";
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

function tourTime(tour: TourRow): number {
  return new Date(tour.capture_date ?? tour.created_at).getTime();
}

export function MatterportManager({ tours }: { tours: TourRow[] }) {
  const { hydrated, scope, clientProjects, project, projects } = useAdminWorkspace();
  const { lens, portalOfProject } = useAdminPortalLens();
  const [thumbnailTour, setThumbnailTour] = useState<TourRow | null>(null);

  const filtered = useMemo(() => {
    const ids = new Set(clientProjects.map((p) => p.id));
    return filterToursByScope(tours, scope, ids).filter(
      (tour) => lens === "all" || portalOfProject(tour.project_id) === lens
    );
  }, [tours, scope, clientProjects, lens, portalOfProject]);

  // One section per project, the most recently scanned project first, and the
  // newest walkthrough first inside each project.
  const groups = useMemo(() => {
    const byProject = new Map<string, TourRow[]>();
    for (const tour of filtered) {
      const list = byProject.get(tour.project_id) ?? [];
      list.push(tour);
      byProject.set(tour.project_id, list);
    }
    const projectById = new Map(projects.map((p) => [p.id, p]));
    return Array.from(byProject.entries())
      .map(([projectId, list]) => {
        const sorted = [...list].sort((a, b) => tourTime(b) - tourTime(a));
        const meta = projectById.get(projectId);
        return {
          projectId,
          projectName: meta?.name ?? sorted[0]?.project?.name ?? "Project",
          clientName: meta?.client_name ?? null,
          portal: portalOfProject(projectId) ?? ("construction" as ClientDashboardType),
          tours: sorted,
          latest: tourTime(sorted[0]),
        };
      })
      .sort((a, b) => b.latest - a.latest);
  }, [filtered, projects, portalOfProject]);

  const showcaseLens = lens === "portfolio" || lens === "property";
  const noun = showcaseLens ? "walkthrough" : "tour";

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {filtered.length} {noun}
        {filtered.length === 1 ? "" : "s"}
        {project
          ? ` for ${project.name}`
          : ` across ${groups.length} project${groups.length === 1 ? "" : "s"}`}
        {lens !== "all" ? ` · ${PORTAL_LENS_SHORT_LABELS[lens]}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="ops-card flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
          <Camera className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-900 dark:text-white">
            {lens === "all" ? "No tours yet" : `No ${PORTAL_LENS_SHORT_LABELS[lens]} ${noun}s yet`}
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Use Upload Center in the sidebar, or Quick add → Virtual Tour, to add a scan.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const PortalIcon = PORTAL_ICONS[group.portal];
            const showcase = isShowcaseDashboard(group.portal);
            return (
              <section key={group.projectId} aria-labelledby={`tours-${group.projectId}`} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h2 id={`tours-${group.projectId}`} className="truncate font-display text-base font-semibold text-slate-900 dark:text-white">
                      <Link href={`/admin/projects/${group.projectId}`} className="hover:underline">
                        {group.projectName}
                      </Link>
                    </h2>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      {group.clientName ? <span>{group.clientName}</span> : null}
                      {lens === "all" ? (
                        <span className="inline-flex items-center gap-1">
                          <PortalIcon className="h-3 w-3" aria-hidden />
                          {PORTAL_LENS_SHORT_LABELS[group.portal]}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {group.tours.length} {showcase ? "walkthrough" : "tour"}
                    {group.tours.length === 1 ? "" : "s"}
                  </span>
                </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {group.tours.map((tour) => {
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
                    <button
                      type="button"
                      onClick={() => setThumbnailTour(tour)}
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700/60"
                    >
                      <Camera className="h-10 w-10 text-slate-300" />
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <ImagePlus className="h-3.5 w-3.5" />
                        Add thumbnail
                      </span>
                    </button>
                  )}
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="overlay"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${tour.name}`}
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
                        <DropdownMenuItem onSelect={() => setThumbnailTour(tour)}>
                          <ImagePlus className="mr-2 h-4 w-4" /> Change thumbnail
                        </DropdownMenuItem>
                        {!showcase ? (
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/compare?scanA=${tour.id}&project=${tour.project_id}`}>
                              <Columns2 className="mr-2 h-4 w-4" /> Compare
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild>
                          <ShareTourDialog
                            tourId={tour.id}
                            tourName={tour.name}
                            trigger={
                              <span className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm">
                                <Share2 className="mr-2 h-4 w-4" /> Share link
                              </span>
                            }
                          />
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
                        {formatDate(tour.capture_date ?? tour.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <ShareTourDialog
                        tourId={tour.id}
                        tourName={tour.name}
                        size="icon"
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Share tour">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <PreviewTourDialog
                        name={tour.name}
                        matterportUrl={tour.matterport_url}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Preview tour">
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
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
              </section>
            );
          })}
        </div>
      )}

      <TourThumbnailDialog
        tour={thumbnailTour}
        onOpenChange={(open) => !open && setThumbnailTour(null)}
      />
    </div>
  );
}
