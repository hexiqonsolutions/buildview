"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  List,
  Download,
  SlidersHorizontal,
  FolderKanban,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Camera,
  AlertTriangle,
  Building2,
  MapPin,
  MoreHorizontal,
  ExternalLink,
  Home,
  ArchiveRestore,
  Trash2,
  Loader2,
  Ban,
  Pencil,
} from "lucide-react";
import type { AdminProjectRow, AdminProjectsListData } from "@/lib/data/projects";
import type { Client, ProjectStatus } from "@/lib/types";
import { softDeleteProject, restoreProject, suspendProject } from "@/lib/actions/admin";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { CreateProjectForm } from "@/components/admin/create-project-form";
import { EditProjectDetailsDialog } from "@/components/admin/edit-project-details-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatRelativeTime, formatStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { UpdateProjectStatusSelect } from "@/components/shared/update-project-status-select";
import {
  PORTAL_ICONS,
  PORTAL_LENS_SHORT_LABELS,
  useOptionalAdminPortalLens,
} from "@/components/admin/workspace/admin-portal-lens";
import { isShowcaseDashboard, type ClientDashboardType } from "@/lib/portal/dashboard-type";
import { getErrorMessage } from "@/lib/errors/public";

type ViewMode = "list" | "grid";

const MAX_PAGE_BUTTONS = 6;

interface AdminProjectsViewProps {
  data: AdminProjectsListData;
  clients: Client[];
  mode?: "admin" | "client";
}

const STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "in_progress", label: "In Progress" },
  { value: "planning", label: "Planning" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "suspended", label: "Suspended" },
];

function issueCountClass(count: number): string {
  if (count === 0) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (count <= 2) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
}

function uniqueLocations(projects: AdminProjectRow[]): string[] {
  return Array.from(new Set(projects.map((p) => p.location).filter(Boolean))).sort();
}

function exportProjectsCsv(projects: AdminProjectRow[]) {
  const headers = ["Code", "Name", "Client", "Location", "Status", "Progress", "Tours", "Open Issues", "Last Scan"];
  const rows = projects.map((p) => [
    p.projectCode,
    p.name,
    p.client_name,
    p.location,
    formatStatus(p.status),
    p.progress == null ? "—" : `${p.progress}%`,
    String(p.tourCount),
    String(p.openIssueCount),
    p.lastScanDate ? formatDate(p.lastScanDate) : "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "buildview-projects.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function rowPortal(project: AdminProjectRow): ClientDashboardType {
  return project.clientDashboardType ?? "construction";
}

/** Archived / suspended projects are hidden from the client portal. */
function isHiddenFromClient(project: AdminProjectRow): boolean {
  return project.status === "archived" || project.status === "suspended";
}

/** Showcase projects have no construction stages, only whether the client can see them. */
function VisibilityPill({ project }: { project: AdminProjectRow }) {
  const hidden = isHiddenFromClient(project);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        hidden
          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          : "bg-brand-accent/15 text-brand-accent-dark"
      )}
      title={hidden ? "Hidden from the client portal" : "Visible in the client portal"}
    >
      {hidden ? "Hidden" : "Live"}
    </span>
  );
}

function PortalBadge({ portal }: { portal: ClientDashboardType }) {
  const Icon = PORTAL_ICONS[portal];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      {PORTAL_LENS_SHORT_LABELS[portal]}
    </span>
  );
}

export function AdminProjectsView({ data, clients, mode = "admin" }: AdminProjectsViewProps) {
  const isAdmin = mode === "admin";
  const lensCtx = useOptionalAdminPortalLens();
  const lens = isAdmin && lensCtx ? lensCtx.lens : "all";
  const showcaseLens = lens === "portfolio" || lens === "property";
  const showConstructionColumns = !showcaseLens;
  const showPortalColumn = isAdmin && lens === "all";
  const projectBase = isAdmin ? "/admin/projects" : "/dashboard/projects";
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const locations = useMemo(() => uniqueLocations(data.projects), [data.projects]);

  const filtered = useMemo(() => {
    return data.projects.filter((p) => {
      if (lens !== "all" && rowPortal(p) !== lens) return false;
      if (clientFilter !== "all" && p.client_id !== clientFilter) return false;
      if (showConstructionColumns && statusFilter !== "all" && p.status !== statusFilter) return false;
      if (locationFilter !== "all" && p.location !== locationFilter) return false;
      return true;
    });
  }, [data.projects, clientFilter, statusFilter, locationFilter, lens, showConstructionColumns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, filtered.length);
  const firstPageButton = Math.max(1, Math.min(currentPage - 2, totalPages - MAX_PAGE_BUTTONS + 1));

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? lens === "construction"
                ? "Construction Intelligence sites: stages, progress and issues."
                : lens === "portfolio"
                  ? "Interior Showcase projects: walkthroughs, photos and videos."
                  : lens === "property"
                    ? "Real Estate Showcase properties: walkthroughs and property pages."
                    : "Every client project, across all three portals."
              : "Monitor construction progress across your portfolio."}
          </p>
        </div>
        {isAdmin && (
          <CreateProjectForm
            clients={clients}
            triggerLabel="Create New Project"
            triggerClassName="ops-btn-primary h-9"
          />
        )}
      </div>

      <ProjectStats projects={filtered} lens={lens} isAdmin={isAdmin} fallback={stats} />

      <div className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={clientFilter}
              onValueChange={(v) => {
                setClientFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {data.clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showConstructionColumns ? (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as ProjectStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            ) : null}
            <Select
              value={locationFilter}
              onValueChange={(v) => {
                setLocationFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              More Filters
            </Button>
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => exportProjectsCsv(filtered)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <FolderKanban className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-900 dark:text-white">No projects found</p>
            <p className="mt-1 text-sm text-slate-500">
              {data.projects.length === 0
                ? "Create your first construction project to get started."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="admin-table-head min-w-[240px]">Project</TableHead>
                  <TableHead className="admin-table-head">Client</TableHead>
                  <TableHead className="admin-table-head">Location</TableHead>
                  {showPortalColumn ? <TableHead className="admin-table-head">Portal</TableHead> : null}
                  <TableHead className="admin-table-head">{showcaseLens ? "Visibility" : "Status"}</TableHead>
                  {showConstructionColumns ? (
                    <TableHead className="admin-table-head min-w-[140px]">Progress</TableHead>
                  ) : null}
                  <TableHead className="admin-table-head">{showcaseLens ? "Walkthroughs" : "Virtual Tours"}</TableHead>
                  {showConstructionColumns ? <TableHead className="admin-table-head">Open Issues</TableHead> : null}
                  <TableHead className="admin-table-head">{showcaseLens ? "Last Walkthrough" : "Last Scan"}</TableHead>
                  <TableHead className="admin-table-head text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((project) => (
                  <ProjectTableRow
                    key={project.id}
                    project={project}
                    projectBase={projectBase}
                    isAdmin={isAdmin}
                    clients={clients}
                    showPortalColumn={showPortalColumn}
                    showConstructionColumns={showConstructionColumns}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((project) => (
              <ProjectGridCard
                key={project.id}
                project={project}
                projectBase={projectBase}
                isAdmin={isAdmin}
                clients={clients}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {rangeStart} to {rangeEnd} of {filtered.length} projects
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: Math.min(totalPages, MAX_PAGE_BUTTONS) }, (_, i) => firstPageButton + i)
                .map((n) => (
                  <Button
                    key={n}
                    variant={n === currentPage ? "default" : "outline"}
                    size="sm"
                    className={cn("h-8 w-8 p-0", n === currentPage && "bg-slate-900 hover:bg-slate-800")}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectThumbnail({ project }: { project: AdminProjectRow }) {
  return (
    <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-slate-700 to-slate-900">
      {project.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.cover_image_url}
          alt={project.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs font-bold text-white/40">
          {project.name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function ProjectActionsMenu({
  project,
  projectBase,
  isAdmin,
  clients,
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
  clients: Client[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "restore" | "delete" | "suspend" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const isSuspended = project.status === "suspended";
  const isHiddenFromClients =
    isSuspended || project.status === "archived";

  function openConfirm(action: "restore" | "delete" | "suspend") {
    setError(null);
    // Let the dropdown fully close first so Radix pointer-events unlock.
    window.setTimeout(() => setConfirmAction(action), 0);
  }

  async function handleConfirm(e: MouseEvent) {
    // Keep AlertDialogAction from auto-closing before we control teardown.
    e.preventDefault();
    if (!confirmAction || busy) return;

    const action = confirmAction;
    setBusy(true);
    setError(null);

    // Close the dialog BEFORE the server action. revalidatePath() can
    // unmount this row while the overlay is still open and freeze the page.
    setConfirmAction(null);
    document.body.style.pointerEvents = "";
    document.body.style.overflow = "";

    try {
      if (action === "delete") {
        await softDeleteProject(project.id);
      } else if (action === "suspend") {
        await suspendProject(project.id);
      } else if (action === "restore") {
        await restoreProject(project.id);
      }
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed. Please try again."));
      // Re-open so the user can retry / see the error.
      setConfirmAction(action);
    } finally {
      setBusy(false);
      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
    }
  }

  const dialogConfig = {
    suspend: {
      title: "Suspend project?",
      description: `"${project.name}" will be suspended and hidden from the client portal until you restore it. Clients will be notified.`,
      action: "Suspend",
      className: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-600",
    },
    restore: {
      title: "Restore project?",
      description: `"${project.name}" will be moved back to On Hold and become visible to clients again.`,
      action: "Restore",
      className: "",
    },
    delete: {
      title: "Delete project?",
      description: `"${project.name}" will be permanently removed from all views. Clients will be notified. This cannot be undone.`,
      action: "Delete",
      className: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    },
  };

  const config = confirmAction ? dialogConfig[confirmAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`${projectBase}/${project.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Project
            </Link>
          </DropdownMenuItem>
          {isAdmin && project.clientDashboardType === "property" ? (
            <DropdownMenuItem asChild>
              <Link href={`/admin/projects/${project.id}?tab=property`}>
                <Home className="mr-2 h-4 w-4" />
                Property details
              </Link>
            </DropdownMenuItem>
          ) : null}
          {isAdmin && (
            <DropdownMenuItem
              onSelect={() => {
                // Let the dropdown fully close first so Radix pointer-events unlock.
                window.setTimeout(() => setEditOpen(true), 0);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Project
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/tours?project=${project.id}`}>
                <Camera className="mr-2 h-4 w-4" />
                View Tours
              </Link>
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              {isHiddenFromClients ? (
                <DropdownMenuItem onSelect={() => openConfirm("restore")}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore Project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => openConfirm("suspend")}>
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend Project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => openConfirm("delete")}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <EditProjectDetailsDialog
          project={project}
          clients={clients}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (busy) return;
          if (!open) {
            setConfirmAction(null);
            setError(null);
            document.body.style.pointerEvents = "";
            document.body.style.overflow = "";
          }
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = "";
            document.body.style.overflow = "";
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{config?.title}</AlertDialogTitle>
            <AlertDialogDescription>{config?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={busy}
              className={config?.className}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Construction projects show Progression Report %; portfolio showcase has no progress. */
function ProjectProgressCell({
  progress,
  progressTrend,
}: {
  progress: number | null;
  progressTrend: string | null;
}) {
  if (progress == null) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-900 dark:text-white">{progress}%</span>
        {progressTrend ? (
          <span className="text-[10px] font-medium text-emerald-600">{progressTrend}</span>
        ) : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ProjectTableRow({
  project,
  projectBase,
  isAdmin,
  clients,
  showPortalColumn = false,
  showConstructionColumns = true,
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
  clients: Client[];
  showPortalColumn?: boolean;
  showConstructionColumns?: boolean;
}) {
  const showcase = isAdmin && isShowcaseDashboard(rowPortal(project));
  return (
    <TableRow>
      <TableCell>
        <Link href={`${projectBase}/${project.id}`} className="flex items-center gap-3 group">
          <ProjectThumbnail project={project} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 group-hover:text-brand-accent-dark dark:text-white">
              {project.name}
            </p>
            {showcase ? null : <p className="truncate text-xs text-slate-500">{project.stage}</p>}
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {project.projectCode}
            </p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate max-w-[120px]">{project.client_name}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-slate-600">{project.location}</TableCell>
      {showPortalColumn ? (
        <TableCell>
          <PortalBadge portal={rowPortal(project)} />
        </TableCell>
      ) : null}
      <TableCell>
        {showcase ? (
          <VisibilityPill project={project} />
        ) : (
          <UpdateProjectStatusSelect
            projectId={project.id}
            currentStatus={project.status}
            allowStaffStatuses={isAdmin}
          />
        )}
      </TableCell>
      {showConstructionColumns ? (
        <TableCell>
          {showcase ? (
            <span className="sr-only">Not tracked for showcase projects</span>
          ) : (
            <ProjectProgressCell progress={project.progress} progressTrend={project.progressTrend} />
          )}
        </TableCell>
      ) : null}
      <TableCell>
        {isAdmin ? (
          <Link
            href={`/admin/tours?project=${project.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300"
          >
            <Camera className="h-3.5 w-3.5 text-brand-accent-dark" />
            {project.tourCount}{" "}
            {showcase
              ? project.tourCount === 1
                ? "walkthrough"
                : "walkthroughs"
              : project.tourCount === 1
                ? "Tour"
                : "Tours"}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Camera className="h-3.5 w-3.5 text-brand-accent-dark" />
            {project.tourCount}{" "}
            {showcase
              ? project.tourCount === 1
                ? "walkthrough"
                : "walkthroughs"
              : project.tourCount === 1
                ? "Tour"
                : "Tours"}
          </span>
        )}
      </TableCell>
      {showConstructionColumns ? (
        <TableCell>
          {showcase ? (
            <span className="sr-only">Not tracked for showcase projects</span>
          ) : (
            <Badge className={cn("font-semibold", issueCountClass(project.openIssueCount))}>
              {project.openIssueCount}
            </Badge>
          )}
        </TableCell>
      ) : null}
      <TableCell>
        {project.lastScanDate ? (
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {formatDate(project.lastScanDate)}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatRelativeTime(project.lastScanDate)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
        {isAdmin && rowPortal(project) === "property" ? (
          <Button asChild size="sm" variant="outline" className="h-8 whitespace-nowrap">
            <Link href={`/admin/projects/${project.id}?tab=property`}>
              <Home className="mr-1.5 h-3.5 w-3.5" />
              Property details
            </Link>
          </Button>
        ) : null}
        <ProjectActionsMenu
          project={project}
          projectBase={projectBase}
          isAdmin={isAdmin}
          clients={clients}
        />
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProjectGridCard({
  project,
  projectBase,
  isAdmin,
  clients,
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
  clients: Client[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-32 bg-linear-to-br from-slate-800 to-slate-900">
        {project.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover_image_url}
            alt={project.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-4xl font-bold text-white/20">
              {project.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute right-3 top-3 z-10">
          {isAdmin && isShowcaseDashboard(rowPortal(project)) ? (
            <VisibilityPill project={project} />
          ) : (
            <UpdateProjectStatusSelect
              projectId={project.id}
              currentStatus={project.status}
              allowStaffStatuses={isAdmin}
              triggerClassName="h-7 w-31 text-[11px]"
            />
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`${projectBase}/${project.id}`}
              className="font-display text-base font-semibold text-slate-900 hover:text-brand-accent-dark dark:text-white"
            >
              {project.name}
            </Link>
            <p className="text-xs text-slate-500">
              {project.projectCode}
              {isAdmin && isShowcaseDashboard(rowPortal(project)) ? "" : ` · ${project.stage}`}
            </p>
          </div>
          <ProjectActionsMenu
            project={project}
            projectBase={projectBase}
            isAdmin={isAdmin}
            clients={clients}
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">{project.client_name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
          {project.location}
        </p>
        {isAdmin && isShowcaseDashboard(rowPortal(project)) ? null : (
          <div className="mt-3">
            <ProjectProgressCell progress={project.progress} progressTrend={project.progressTrend} />
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" /> {project.tourCount}{" "}
            {isAdmin && isShowcaseDashboard(rowPortal(project)) ? "walkthroughs" : "tours"}
          </span>
          {isAdmin && isShowcaseDashboard(rowPortal(project)) ? (
            <PortalBadge portal={rowPortal(project)} />
          ) : (
            <Badge className={cn("text-[10px]", issueCountClass(project.openIssueCount))}>
              {project.openIssueCount} issues
            </Badge>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          className="mt-4 w-full bg-slate-900 hover:bg-slate-800"
          asChild
        >
          <Link href={`${projectBase}/${project.id}`}>Open Project</Link>
        </Button>
      </div>
    </div>
  );
}


/** Lens-aware summary cards. Counts come from the visible rows; no invented trends. */
function ProjectStats({
  projects,
  lens,
  isAdmin,
  fallback,
}: {
  projects: AdminProjectRow[];
  lens: "all" | ClientDashboardType;
  isAdmin: boolean;
  fallback: AdminProjectsListData["stats"];
}) {
  const tours = projects.reduce((sum, p) => sum + p.tourCount, 0);
  const openIssues = projects.reduce((sum, p) => sum + p.openIssueCount, 0);
  const count = (fn: (p: AdminProjectRow) => boolean) => projects.filter(fn).length;

  if (!isAdmin) {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <AdminMetricCard label="Total Projects" value={fallback.totalProjects} icon={FolderKanban} />
        <AdminMetricCard label="Active Projects" value={fallback.activeProjects} icon={PlayCircle} />
        <AdminMetricCard label="On Hold Projects" value={fallback.onHoldProjects} icon={PauseCircle} />
        <AdminMetricCard label="Completed Projects" value={fallback.completedProjects} icon={CheckCircle2} />
        <AdminMetricCard label="Total Virtual Tours" value={fallback.totalTours} icon={Camera} />
        <AdminMetricCard label="Open Issues" value={fallback.openIssues} icon={AlertTriangle} />
      </div>
    );
  }

  if (lens === "portfolio" || lens === "property") {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <AdminMetricCard label={lens === "property" ? "Properties" : "Projects"} value={projects.length} icon={FolderKanban} />
        <AdminMetricCard label="Walkthroughs" value={tours} icon={Camera} />
        <AdminMetricCard label="Live for clients" value={count((p) => !isHiddenFromClient(p))} icon={PlayCircle} />
        <AdminMetricCard label="Hidden from clients" value={count(isHiddenFromClient)} icon={PauseCircle} />
      </div>
    );
  }

  if (lens === "construction") {
    return (
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <AdminMetricCard label="Total Projects" value={projects.length} icon={FolderKanban} />
        <AdminMetricCard label="Active Projects" value={count((p) => p.status === "in_progress")} icon={PlayCircle} />
        <AdminMetricCard label="On Hold Projects" value={count((p) => p.status === "on_hold")} icon={PauseCircle} />
        <AdminMetricCard label="Completed Projects" value={count((p) => p.status === "completed")} icon={CheckCircle2} />
        <AdminMetricCard label="Virtual Tours" value={tours} icon={Camera} />
        <AdminMetricCard label="Open Issues" value={openIssues} icon={AlertTriangle} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      <AdminMetricCard label="All Projects" value={projects.length} icon={FolderKanban} />
      <AdminMetricCard label="Construction" value={count((p) => rowPortal(p) === "construction")} icon={PORTAL_ICONS.construction} />
      <AdminMetricCard label="Interior" value={count((p) => rowPortal(p) === "portfolio")} icon={PORTAL_ICONS.portfolio} />
      <AdminMetricCard label="Real Estate" value={count((p) => rowPortal(p) === "property")} icon={PORTAL_ICONS.property} />
      <AdminMetricCard label="Virtual Tours" value={tours} icon={Camera} />
    </div>
  );
}
