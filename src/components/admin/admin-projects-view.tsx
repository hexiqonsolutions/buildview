"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { AdminProjectRow, AdminProjectsListData } from "@/lib/actions/data";
import type { Client, ProjectStatus } from "@/lib/types";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { CreateProjectForm } from "@/components/admin/create-project-form";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatRelativeTime, formatStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "grid";

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
];

function projectStatusClass(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    in_progress: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    on_hold: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    planning: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  };
  return map[status];
}

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
    `${p.progress}%`,
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

export function AdminProjectsView({ data, clients, mode = "admin" }: AdminProjectsViewProps) {
  const isAdmin = mode === "admin";
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
      if (clientFilter !== "all" && p.client_id !== clientFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (locationFilter !== "all" && p.location !== locationFilter) return false;
      return true;
    });
  }, [data.projects, clientFilter, statusFilter, locationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, filtered.length);

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
              ? "Manage and monitor all construction projects."
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

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <AdminMetricCard
          label="Total Projects"
          value={stats.totalProjects}
          icon={FolderKanban}
          trend="↑ 12% vs last month"
        />
        <AdminMetricCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={PlayCircle}
          trend="↑ 8% vs last month"
        />
        <AdminMetricCard
          label="On Hold Projects"
          value={stats.onHoldProjects}
          icon={PauseCircle}
          trend="↓ 2% vs last month"
          trendTone="down"
        />
        <AdminMetricCard
          label="Completed Projects"
          value={stats.completedProjects}
          icon={CheckCircle2}
          trend="↑ 5% vs last month"
        />
        <AdminMetricCard
          label="Total Matterport Tours"
          value={stats.totalTours}
          icon={Camera}
          trend="↑ 15% vs last month"
        />
        <AdminMetricCard
          label="Open Issues"
          value={stats.openIssues}
          icon={AlertTriangle}
          trend="↑ 10% vs last month"
        />
      </div>

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
                  <TableHead className="admin-table-head">Status</TableHead>
                  <TableHead className="admin-table-head min-w-[140px]">Progress</TableHead>
                  <TableHead className="admin-table-head">Matterport Tours</TableHead>
                  <TableHead className="admin-table-head">Open Issues</TableHead>
                  <TableHead className="admin-table-head">Last Scan</TableHead>
                  <TableHead className="admin-table-head text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((project) => (
                  <ProjectTableRow key={project.id} project={project} projectBase={projectBase} isAdmin={isAdmin} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((project) => (
              <ProjectGridCard key={project.id} project={project} projectBase={projectBase} isAdmin={isAdmin} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {rangeStart} to {rangeEnd} of {filtered.length} projects
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 6)
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
    <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-700 to-slate-900">
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
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`${projectBase}/${project.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Project
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href={`/admin/tours?project=${project.id}`}>
              <Camera className="mr-2 h-4 w-4" />
              View Tours
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectTableRow({
  project,
  projectBase,
  isAdmin,
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`${projectBase}/${project.id}`} className="flex items-center gap-3 group">
          <ProjectThumbnail project={project} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 group-hover:text-brand-accent-dark dark:text-white">
              {project.name}
            </p>
            <p className="truncate text-xs text-slate-500">{project.stage}</p>
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
      <TableCell>
        <Badge className={cn("font-medium", projectStatusClass(project.status))}>
          {formatStatus(project.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">{project.progress}%</span>
            {project.progressTrend && (
              <span className="text-[10px] font-medium text-emerald-600">{project.progressTrend}</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </TableCell>
      <TableCell>
        {isAdmin ? (
          <Link
            href={`/admin/tours?project=${project.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300"
          >
            <Camera className="h-3.5 w-3.5 text-brand-accent-dark" />
            {project.tourCount} {project.tourCount === 1 ? "Tour" : "Tours"}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Camera className="h-3.5 w-3.5 text-brand-accent-dark" />
            {project.tourCount} {project.tourCount === 1 ? "Tour" : "Tours"}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={cn("font-semibold", issueCountClass(project.openIssueCount))}>
          {project.openIssueCount}
        </Badge>
      </TableCell>
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
        <ProjectActionsMenu project={project} projectBase={projectBase} isAdmin={isAdmin} />
      </TableCell>
    </TableRow>
  );
}

function ProjectGridCard({
  project,
  projectBase,
  isAdmin,
}: {
  project: AdminProjectRow;
  projectBase: string;
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-32 bg-gradient-to-br from-slate-800 to-slate-900">
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
        <Badge className={cn("absolute right-3 top-3", projectStatusClass(project.status))}>
          {formatStatus(project.status)}
        </Badge>
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
            <p className="text-xs text-slate-500">{project.projectCode} · {project.stage}</p>
          </div>
          <ProjectActionsMenu project={project} projectBase={projectBase} isAdmin={isAdmin} />
        </div>
        <p className="mt-1 text-sm text-slate-500">{project.client_name}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
          {project.location}
        </p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 dark:text-white">{project.progress}%</span>
            {project.progressTrend && (
              <span className="text-emerald-600">{project.progressTrend}</span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" /> {project.tourCount} tours
          </span>
          <Badge className={cn("text-[10px]", issueCountClass(project.openIssueCount))}>
            {project.openIssueCount} issues
          </Badge>
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
