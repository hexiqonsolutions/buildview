"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Columns2,
  Share2,
  Maximize2,
  Calendar,
  Camera,
  Building2,
  Layers,
} from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { MatterportCompare } from "@/components/projects/matterport-compare";
import {
  MatterportMetadataGrid,
  MatterportNotes,
} from "@/components/intel/matterport/matterport-metadata";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate, getMatterportShareUrl } from "@/lib/utils";
import type { ProjectTour } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { getTourDisplayFields } from "@/lib/comparison/metadata";

type TourGroup = {
  key: string;
  building: string | null;
  floor: string | null;
  tours: ProjectTour[];
};

function groupToursBySpatial(tours: ProjectTour[]): TourGroup[] {
  const map = new Map<string, TourGroup>();

  for (const tour of tours) {
    const fields = getTourDisplayFields(tour);
    const building = fields.building ?? null;
    const floor = fields.floor ?? null;
    const key = `${building ?? "__none__"}|${floor ?? "__none__"}`;

    if (!map.has(key)) {
      map.set(key, { key, building, floor, tours: [] });
    }
    map.get(key)!.tours.push(tour);
  }

  return Array.from(map.values());
}

function hasSpatialData(tours: ProjectTour[]): boolean {
  return tours.some((t) => {
    const f = getTourDisplayFields(t);
    return f.building || f.floor;
  });
}

export function ProjectToursSection({
  tours,
  projectId,
}: {
  tours: ProjectTour[];
  projectId?: string;
}) {
  const [comparing, setComparing] = useState(false);
  const [selectedId, setSelectedId] = useState(tours[0]?.id ?? "");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const router = useRouter();
  const { dashboardType } = usePortalWorkspace();
  const isPortfolio = dashboardType === "portfolio";

  const groups = useMemo(() => groupToursBySpatial(tours), [tours]);
  const hasSpatial = useMemo(() => hasSpatialData(tours), [tours]);

  const visibleTours = useMemo(() => {
    if (!filterGroup) return tours;
    const group = groups.find((g) => g.key === filterGroup);
    return group?.tours ?? tours;
  }, [filterGroup, groups, tours]);

  if (tours.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title={isPortfolio ? "No walkthroughs yet." : "No virtual tours available yet."}
        description={
          isPortfolio
            ? "Virtual walkthroughs will appear here once your BuildView team uploads them."
            : "360° virtual tours will appear here once added by your administrator."
        }
      />
    );
  }

  const selectedTour = visibleTours.find((t) => t.id === selectedId) ?? visibleTours[0] ?? tours[0];
  const pid = projectId ?? tours[0]?.project_id ?? "";

  if (comparing && !isPortfolio) {
    return <MatterportCompare tours={tours} onClose={() => setComparing(false)} />;
  }

  const shareUrl = getMatterportShareUrl(selectedTour.matterport_url);
  const selectedFields = getTourDisplayFields(selectedTour);

  return (
    <div className="space-y-6">
      {/* Building / Floor filter pills */}
      {hasSpatial && groups.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Filter by location
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterGroup(null);
                setSelectedId(tours[0]?.id ?? "");
              }}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                !filterGroup
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              All ({tours.length})
            </button>
            {groups.map((g) => {
              const label = [g.building, g.floor].filter(Boolean).join(" · ") || "Unassigned";
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    setFilterGroup(g.key);
                    setSelectedId(g.tours[0]?.id ?? "");
                  }}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                    filterGroup === g.key
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  )}
                >
                  {g.building && <Building2 className="h-3 w-3" />}
                  {g.floor && <Layers className="h-3 w-3" />}
                  {label} ({g.tours.length})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tours.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {isPortfolio ? "Walkthrough library" : "Project scans"}
              </p>
              <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {isPortfolio
                  ? `${tours.length} walkthrough${tours.length === 1 ? "" : "s"}`
                  : `All scans (${tours.length})`}
              </h3>
            </div>
            {filterGroup && (
              <p className="text-xs text-slate-500">
                Showing {visibleTours.length} of {tours.length}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTours.map((tour) => {
              const fields = getTourDisplayFields(tour);
              const selected = tour.id === selectedTour.id;
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setSelectedId(tour.id)}
                  className={cn(
                    "group overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200",
                    "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                    "dark:bg-slate-900/60 dark:hover:border-slate-600",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40",
                    selected
                      ? "border-slate-900 ring-2 ring-slate-900/20 dark:border-white dark:ring-white/20"
                      : "border-slate-200/80 dark:border-slate-800"
                  )}
                >
                  <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                    {tour.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tour.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Camera className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    {selected && (
                      <span className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
                        Viewing
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 p-3">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {tour.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      {tour.capture_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(tour.capture_date)}
                        </span>
                      )}
                      {fields.building && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {fields.building}
                        </span>
                      )}
                      {fields.floor && (
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {fields.floor}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="intel-card overflow-hidden">
        <MatterportViewer
          url={selectedTour.matterport_url}
          title={selectedTour.name}
          aspectRatio
          showToolbar
          className="rounded-none"
        />

        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                {selectedTour.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {selectedTour.capture_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Captured {formatDate(selectedTour.capture_date)}
                  </span>
                )}
                {selectedFields.building && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-500" />
                    {selectedFields.building}
                  </span>
                )}
                {selectedFields.floor && (
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-500" />
                    {selectedFields.floor}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPortfolio && tours.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => setComparing(true)}>
                  <Columns2 className="mr-1.5 h-4 w-4" />
                  Compare scans
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Share
                </a>
              </Button>
              {!isPortfolio && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/projects/${pid}?tab=timeline`}>Open Timeline</Link>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800"
                    onClick={() => {
                      const a = selectedTour.id;
                      const b =
                        tours.find((t) => t.id !== a)?.id ?? tours[0]?.id ?? a;
                      router.push(
                        `/dashboard/matterport-comparison?project=${pid}&scanA=${a}&scanB=${b}`
                      );
                    }}
                  >
                    <Maximize2 className="mr-1.5 h-4 w-4" />
                    Full Compare
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <MatterportMetadataGrid tour={selectedTour} />
            <MatterportNotes tour={selectedTour} />
          </div>
        </div>
      </div>
    </div>
  );
}
