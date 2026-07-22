"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Camera,
  FileText,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Calendar,
  MoreHorizontal,
  X,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import type { TimelinePageData } from "@/lib/timeline/page-data";
import type { Project, ProjectTour, Report } from "@/lib/types";
import {
  buildAdminTimelineMonths,
  formatMonthLabel,
  getBuildingOptions,
  getFloorOptions,
  type AdminTimelineMonth,
} from "@/lib/timeline/admin-timeline";
import { CreateTimelineEventForm } from "@/components/admin/create-timeline-event-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AdminTimelineWorkspaceFilters {
  projectId: string;
  building: string;
  floor: string;
  buildingId?: string | null;
  floorId?: string | null;
  buildingOptions: string[];
  floorOptions: string[];
  onProjectChange: (id: string) => void;
  onBuildingChange: (building: string) => void;
  onFloorChange: (floor: string) => void;
}

interface AdminTimelineViewProps {
  data: TimelinePageData;
  mode?: "admin" | "client";
  isDemo?: boolean;
  initialProjectId?: string;
  workspaceFilters?: AdminTimelineWorkspaceFilters;
}

const TRADE_BAR_COLORS: Record<string, string> = {
  Structure: "bg-emerald-500",
  Masonry: "bg-amber-400",
  Electrical: "bg-orange-400",
  Plumbing: "bg-rose-400",
};

function statusBadgeClass(status: AdminTimelineMonth["status"]): string {
  return status === "in_progress"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
}

function priorityDotClass(priority: string): string {
  const map: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };
  return map[priority] ?? "bg-slate-400";
}

function priorityClass(priority: string): string {
  const map: Record<string, string> = {
    critical: "bg-rose-100 text-rose-800",
    high: "bg-rose-100 text-rose-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-emerald-100 text-emerald-800",
  };
  return map[priority] ?? "bg-slate-100 text-slate-700";
}

function projectThumbnail(
  project: Project,
  tours: Array<ProjectTour & { project?: { name: string } | null }>
): string | null {
  if (project.cover_image_url) return project.cover_image_url;
  const tour = tours.find((t) => t.project_id === project.id);
  return tour?.thumbnail_url ?? null;
}

function MilestoneThumbnail({ month }: { month: AdminTimelineMonth }) {
  if (month.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={month.thumbnailUrl}
        alt={month.title}
        className="h-[72px] w-[104px] shrink-0 rounded-lg object-cover ring-1 ring-slate-200/80 dark:ring-slate-700"
      />
    );
  }
  return (
    <div className="flex h-[72px] w-[104px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-700">
      <Calendar className="h-7 w-7 text-white/30" />
    </div>
  );
}

export function AdminTimelineView({
  data,
  mode = "admin",
  isDemo = false,
  initialProjectId,
  workspaceFilters,
}: AdminTimelineViewProps) {
  const isAdmin = mode === "admin";
  const projectBase = isAdmin ? "/admin/projects" : "/dashboard/projects";
  const cardClass = "ops-card";
  const { projects, events, tours, reports, issues } = data;
  const resolvedInitialProjectId =
    workspaceFilters?.projectId ??
    initialProjectId ??
    projects[0]?.id ??
    "";
  const [projectId, setProjectId] = useState(resolvedInitialProjectId);
  const [building, setBuilding] = useState(workspaceFilters?.building ?? "all");
  const [floor, setFloor] = useState(workspaceFilters?.floor ?? "all");
  const [viewMode, setViewMode] = useState<"monthly" | "weekly">("monthly");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!workspaceFilters) return;
    setProjectId(workspaceFilters.projectId);
    setBuilding(workspaceFilters.building);
    setFloor(workspaceFilters.floor);
  }, [workspaceFilters]);

  const activeProjectId = workspaceFilters?.projectId ?? projectId;
  const activeBuilding = workspaceFilters?.building ?? building;
  const activeFloor = workspaceFilters?.floor ?? floor;
  const activeBuildingId = workspaceFilters?.buildingId ?? null;
  const activeFloorId = workspaceFilters?.floorId ?? null;
  const handleProjectChange = workspaceFilters?.onProjectChange ?? setProjectId;
  const handleBuildingChange = workspaceFilters?.onBuildingChange ?? setBuilding;
  const handleFloorChange = workspaceFilters?.onFloorChange ?? setFloor;

  const project = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const buildings = useMemo(() => {
    if (workspaceFilters) return workspaceFilters.buildingOptions;
    return project ? getBuildingOptions(tours, project.id) : [];
  }, [workspaceFilters, tours, project]);
  const floors = useMemo(() => {
    if (workspaceFilters) return workspaceFilters.floorOptions;
    return project ? getFloorOptions(tours, project.id, activeBuilding) : [];
  }, [workspaceFilters, tours, project, activeBuilding]);

  const months = useMemo(() => {
    if (!project) return [];
    return buildAdminTimelineMonths(
      project,
      events,
      tours,
      reports,
      issues,
      activeBuilding,
      activeFloor,
      activeBuildingId,
      activeFloorId
    );
  }, [project, events, tours, reports, issues, activeBuilding, activeFloor, activeBuildingId, activeFloorId]);

  const [editOpen, setEditOpen] = useState(false);
  const selectedEvent = useMemo(() => {
    const month = months.find((m) => m.id === selectedId) ?? months[0] ?? null;
    if (!month?.eventId) return null;
    return events.find((e) => e.id === month.eventId) ?? null;
  }, [months, selectedId, events]);

  useEffect(() => {
    if (workspaceFilters) return;
    if (projects.length > 0 && (!projectId || !projects.some((p) => p.id === projectId))) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId, workspaceFilters]);

  useEffect(() => {
    if (workspaceFilters) return;
    setBuilding("all");
    setFloor("all");
  }, [projectId, workspaceFilters]);

  useEffect(() => {
    if (months.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !months.some((m) => m.id === selectedId)) {
      setSelectedId(months[0].id);
      setPanelOpen(true);
    }
  }, [months, selectedId]);

  const selected = months.find((m) => m.id === selectedId) ?? months[0] ?? null;

  if (projects.length === 0) {
    return (
      <div className={cn(cardClass, "flex flex-col items-center px-6 py-16 text-center")}>
        <Calendar className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-900 dark:text-white">No projects yet</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          {isAdmin
            ? "Add a project in Project Manager, then return here to log milestones."
            : "Your account has no assigned projects yet. Contact your BuildView administrator to get access."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isDemo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="font-semibold">Preview mode</span> — showing sample timeline data for Green
          Heights Tower. Assign projects to your account to see live milestones.
        </div>
      )}
      {!isAdmin && (
        <TimelinePageHeader
          project={project}
          tours={tours}
          projects={projects}
          projectId={activeProjectId}
          onProjectChange={handleProjectChange}
          hydrated={hydrated}
        />
      )}

      <div className={cn(cardClass, "flex flex-wrap items-end justify-between gap-4 p-4")}>
        <div className="flex flex-wrap items-end gap-3">
          {hydrated ? (
            <>
              <FilterSelect
                label="Project"
                value={activeProjectId}
                onChange={handleProjectChange}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                width="w-[190px]"
              />
              <FilterSelect
                label="Building"
                value={activeBuilding}
                onChange={handleBuildingChange}
                options={[
                  { value: "all", label: "All Buildings" },
                  ...buildings.map((b) => ({ value: b, label: b })),
                ]}
                width="w-[150px]"
              />
              <FilterSelect
                label="Floor"
                value={activeFloor}
                onChange={handleFloorChange}
                options={[
                  { value: "all", label: "All Floors" },
                  ...floors.map((f) => ({ value: f, label: f })),
                ]}
                width="w-[140px]"
              />
              <FilterSelect
                label="View"
                value={viewMode}
                onChange={(v) => setViewMode(v as "monthly" | "weekly")}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "weekly", label: "Weekly" },
                ]}
                width="w-[130px]"
              />
            </>
          ) : (
            <>
              <FilterSkeleton width="w-[190px]" />
              <FilterSkeleton width="w-[150px]" />
              <FilterSkeleton width="w-[140px]" />
              <FilterSkeleton width="w-[130px]" />
            </>
          )}
        </div>
        {isAdmin && (
          <CreateTimelineEventForm
            projects={projects}
            tours={tours}
            reports={reports}
            triggerLabel="Add Milestone"
            triggerClassName="h-9 bg-slate-900 px-4 text-sm text-white hover:bg-slate-800"
            defaultProjectId={activeProjectId}
          />
        )}
      </div>

      {months.length === 0 ? (
        <div className={cn(cardClass, "flex flex-col items-center px-6 py-16 text-center")}>
          <Calendar className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-900 dark:text-white">No timeline milestones yet</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {isAdmin
              ? "Add a milestone with progress %, trades, overview, and what’s new — nothing is auto-filled."
              : "Milestones will appear here once your BuildView team publishes a progress update."}
          </p>
          {isAdmin && (
            <div className="mt-5">
              <CreateTimelineEventForm
                projects={projects}
                tours={tours}
                reports={reports}
                triggerLabel="Add first milestone"
                defaultProjectId={activeProjectId}
              />
            </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={cn("xl:col-span-7", panelOpen && selected && "xl:col-span-7")}>
          <div className="relative space-y-5">
            <div className="absolute bottom-4 left-[88px] top-4 w-px bg-slate-200 dark:bg-slate-700" />
            {months.map((month, index) => {
              const isSelected = selected?.id === month.id;
              const isCurrent = index === 0;
              return (
                <div key={month.id} className="flex gap-4">
                  <div className="hidden w-[72px] shrink-0 pt-5 text-right sm:block">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {month.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(month.date)}</p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(month.id);
                      setPanelOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(month.id);
                        setPanelOpen(true);
                      }
                    }}
                    className="relative min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <div
                      className={cn(
                        "absolute -left-[13px] top-8 z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white shadow-sm dark:border-slate-900",
                        isSelected || isCurrent
                          ? "bg-emerald-500 ring-4 ring-emerald-500/15"
                          : "bg-slate-300 dark:bg-slate-600"
                      )}
                    />
                    <div
                      className={cn(
                        cardClass,
                        "overflow-hidden transition-all",
                        isSelected
                          ? "border-emerald-300/80 bg-emerald-50/40 ring-1 ring-emerald-400/50 dark:border-emerald-800/60 dark:bg-emerald-950/20"
                          : "hover:shadow-md"
                      )}
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <MilestoneThumbnail month={month} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3 className="font-display text-[15px] font-semibold text-slate-900 dark:text-white">
                                {month.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn("shrink-0 text-[11px]", statusBadgeClass(month.status))}
                              >
                                {month.status === "in_progress" ? "In Progress" : "Completed"}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedId(month.id);
                                    setPanelOpen(true);
                                  }}
                                >
                                  View details
                                </DropdownMenuItem>
                                {isAdmin && !isDemo && month.eventId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedId(month.id);
                                      setEditOpen(true);
                                    }}
                                  >
                                    Edit milestone
                                  </DropdownMenuItem>
                                )}
                                {!isDemo && (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`${projectBase}/${project!.id}?month=${month.monthKey}`}
                                    >
                                      Open project
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                            <StatPill
                              icon={Camera}
                              label={`${month.counts.tours} Matterport`}
                              color="text-blue-500"
                            />
                            <StatPill
                              icon={FileText}
                              label={`${month.counts.reports} Reports`}
                              color="text-emerald-500"
                            />
                            <StatPill
                              icon={ImageIcon}
                              label={`${month.counts.photos} Photos`}
                              color="text-orange-500"
                            />
                            <StatPill
                              icon={AlertTriangle}
                              label={`${month.counts.issues} Issues`}
                              color="text-rose-500"
                            />
                          </div>
                        </div>
                        <div className="hidden shrink-0 text-right text-xs text-slate-500 lg:block">
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(month.date)}
                          </p>
                          <p className="mt-1">By {month.author}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {panelOpen && selected ? (
          <div className="xl:col-span-5">
            <MilestoneDetailPanel
              month={selected}
              project={project!}
              projectBase={projectBase}
              cardClass={cardClass}
              isDemo={isDemo}
              isAdmin={isAdmin}
              onClose={() => setPanelOpen(false)}
              onEdit={
                isAdmin && selected.eventId
                  ? () => setEditOpen(true)
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="hidden xl:col-span-5 xl:block">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className={cn(
                cardClass,
                "flex h-full min-h-[360px] w-full items-center justify-center p-6 text-sm text-slate-500 hover:text-slate-700"
              )}
            >
              Select a milestone to view details
            </button>
          </div>
        )}
      </div>
      )}

      {isAdmin && selectedEvent && (
        <CreateTimelineEventForm
          projects={projects}
          tours={tours}
          reports={reports}
          editEvent={selectedEvent}
          open={editOpen}
          onOpenChange={setEditOpen}
          hideTrigger
          triggerLabel="Edit Milestone"
        />
      )}
    </div>
  );
}

function TimelinePageHeader({
  project,
  tours,
  projects,
  projectId,
  onProjectChange,
  hydrated = true,
}: {
  project?: Project;
  tours?: Array<ProjectTour & { project?: { name: string } | null }>;
  projects?: Project[];
  projectId?: string;
  onProjectChange?: (id: string) => void;
  hydrated?: boolean;
}) {
  const thumb = project && tours ? projectThumbnail(project, tours) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Timeline
        </h1>
        <p className="mt-1 text-sm text-slate-500">Track construction progress over time.</p>
      </div>

      {project && projects && onProjectChange && projectId && hydrated ? (
        <div className="flex items-center gap-3">
          <Select value={projectId} onValueChange={onProjectChange}>
            <SelectTrigger className="h-11 w-[min(100%,280px)] gap-2 border-slate-200 bg-white px-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 [&>svg:last-child]:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-7 w-10 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                )}
                <SelectValue />
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : project ? (
        <div className="h-11 w-[min(100%,280px)] animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      ) : null}
    </div>
  );
}

function FilterSkeleton({ width }: { width: string }) {
  return (
    <div className={cn("space-y-1", width)}>
      <div className="h-3 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="h-9 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  width,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  width: string;
}) {
  return (
    <div className={cn("space-y-1", width)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-white text-xs dark:bg-slate-900">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      {label}
    </span>
  );
}

function MilestoneDetailPanel({
  month,
  project,
  projectBase,
  cardClass,
  isDemo = false,
  isAdmin = false,
  onClose,
  onEdit,
}: {
  month: AdminTimelineMonth;
  project: Project;
  projectBase: string;
  cardClass: string;
  isDemo?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const hasProgress = month.progress.overall != null;
  const delta =
    hasProgress && month.progress.previousOverall != null
      ? month.progress.overall! - month.progress.previousOverall
      : null;
  const priorLabel =
    month.progress.previousOverall != null
      ? formatMonthLabel(
          (() => {
            const [y, m] = month.monthKey.split("-").map(Number);
            const d = new Date(y, m - 2, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          })()
        )
      : null;

  return (
    <div className={cn(cardClass, "sticky top-24 overflow-hidden")}>
      <div className="border-b border-slate-100 p-5 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {month.title}
              </h2>
              <Badge variant="outline" className={cn("text-[11px]", statusBadgeClass(month.status))}>
                {month.status === "in_progress" ? "In Progress" : "Completed"}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              {formatDate(month.date)} · By {month.author}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin && onEdit && (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={onEdit}>
                Edit
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-12rem)] space-y-6 overflow-y-auto p-5">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Overview
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {month.overview || "No overview added for this milestone."}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Progress Summary
          </h3>
          {hasProgress ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <span className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {month.progress.overall}%
                </span>
                {delta != null && delta !== 0 && priorLabel && (
                  <span
                    className={cn(
                      "mb-1 inline-flex items-center gap-1 text-sm font-semibold",
                      delta >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}
                  >
                    <TrendingUp className={cn("h-4 w-4", delta < 0 && "rotate-180")} />
                    {delta >= 0 ? "+" : ""}
                    {delta}% vs {priorLabel}
                  </span>
                )}
              </div>
              {month.progress.trades.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {month.progress.trades.map((trade) => (
                    <div key={trade.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{trade.name}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {trade.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            trade.color ?? TRADE_BAR_COLORS[trade.name] ?? "bg-emerald-500"
                          )}
                          style={{ width: `${trade.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No trade breakdown added.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No progress % saved yet. Edit this milestone to add overall and trade progress.
            </p>
          )}
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            What&apos;s New
          </h3>
          {month.whatsNew.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No highlights added.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {month.whatsNew.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Top Issues
          </h3>
          {month.topIssues.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No issues recorded this month.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {month.topIssues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", priorityDotClass(issue.priority))}
                    />
                    <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                      {issue.title}
                    </span>
                  </div>
                  <Badge className={cn("shrink-0 text-[10px] capitalize", priorityClass(issue.priority))}>
                    {formatStatus(issue.priority)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isDemo ? (
          <Button className="w-full bg-slate-900 hover:bg-slate-800" disabled>
            View Month Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button asChild className="w-full bg-slate-900 hover:bg-slate-800">
            <Link href={`${projectBase}/${project.id}?month=${month.monthKey}`}>
              View Month Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
