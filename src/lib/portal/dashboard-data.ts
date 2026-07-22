import type { WorkspaceScope } from "@/lib/admin/workspace";
import {
  filterBySpatialScope,
  filterToursByScope,
} from "@/lib/admin/scope";
import { normalizeWorkspaceScope } from "@/lib/admin/workspace-scope";
import { portalToAdminBootstrap } from "@/lib/portal/workspace";
import {
  getClientDashboardData,
  getAccessibleTours,
  getAllDocuments,
  getAllReports,
  getAllTimelineEvents,
  getPortalWorkspaceBootstrap,
  type ClientDashboardData,
  type ProjectWithMeta,
} from "@/lib/actions/data";
import type { ProjectTour } from "@/lib/types";

function isNarrowWorkspaceScope(scope: WorkspaceScope): boolean {
  return Boolean(
    scope.projectId ||
      scope.building !== "all" ||
      scope.floor !== "all" ||
      scope.buildingId ||
      scope.floorId
  );
}

function scopedTrendLabel(): { text: string; tone: "neutral" } {
  return { text: "Scoped to active workspace", tone: "neutral" };
}

export async function getPortalScopedDashboardData(
  scope: WorkspaceScope
): Promise<ClientDashboardData> {
  const bootstrap = await getPortalWorkspaceBootstrap();
  const normalized = normalizeWorkspaceScope(portalToAdminBootstrap(bootstrap), {
    ...scope,
    clientId: scope.clientId ?? bootstrap.clientId,
  });

  if (!isNarrowWorkspaceScope(normalized)) {
    return getClientDashboardData();
  }

  const base = await getClientDashboardData();
  const projects = filterDashboardProjects(base.projects, normalized);
  const projectIds = new Set(projects.map((p) => p.id));

  const [toursRaw, allDocs, allReports, allTimeline] = await Promise.all([
    getAccessibleTours(),
    getAllDocuments(),
    getAllReports(),
    getAllTimelineEvents(),
  ]);

  const scopedTours = filterToursByScope(
    toursRaw as ProjectTour[],
    normalized,
    projectIds
  );

  const openIssuesList = filterBySpatialScope(base.openIssuesList, normalized, projectIds);
  const upcomingMilestones = filterBySpatialScope(
    base.upcomingMilestones,
    normalized,
    projectIds
  );

  const scopedDocs = filterBySpatialScope(
    allDocs.filter((d) => d.is_current !== false),
    normalized,
    projectIds
  );

  const latestDocuments = scopedDocs.slice(0, 5).map((d) => ({
    id: d.id,
    name: d.name,
    projectName: projects.find((p) => p.id === d.project_id)?.name ?? "Project",
    created_at: d.created_at,
    category: d.category,
  }));

  const sortedTours = [...scopedTours].sort(
    (a, b) =>
      new Date(b.capture_date ?? b.created_at).getTime() -
      new Date(a.capture_date ?? a.created_at).getTime()
  );
  const latestTourRaw = sortedTours[0] as
    | (ProjectTour & { project?: { id: string; name: string } })
    | undefined;

  const latestTour = latestTourRaw
    ? {
        ...latestTourRaw,
        projectName:
          latestTourRaw.project?.name ??
          projects.find((p) => p.id === latestTourRaw.project_id)?.name ??
          "Project",
        projectId: latestTourRaw.project_id,
      }
    : null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const scopedReports = filterBySpatialScope(allReports, normalized, projectIds);
  const reportsThisMonth = scopedReports.filter((r) => r.report_date >= startOfMonth).length;

  const activeProjects = projects.filter((p) => p.status !== "completed").length;
  const totalTours = scopedTours.length;
  const openIssues = openIssuesList.length;

  const overallProgressPercent =
    projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const scopedTimeline = filterBySpatialScope(allTimeline, normalized, projectIds).filter(
    (e) => e.event_date >= sixMonthsAgo.toISOString().split("T")[0]
  );

  const monthlyProgress = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString("en-US", { month: "short" });
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const count = scopedTimeline.filter((e) => {
      const d = new Date(e.event_date);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    }).length;
    return { month, count };
  });

  const trend = scopedTrendLabel();

  return {
    ...base,
    stats: {
      ...base.stats,
      openIssues,
      latestReports: filterBySpatialScope(base.stats.latestReports, normalized, projectIds).slice(
        0,
        5
      ),
      recentActivity: base.stats.recentActivity.filter(
        (a) => a.project_id && projectIds.has(a.project_id)
      ),
    },
    kpis: {
      activeProjects,
      totalTours,
      reportsThisMonth,
      openIssues,
      trends: {
        activeProjects: trend,
        totalTours: trend,
        reportsThisMonth: trend,
        openIssues: trend,
      },
    },
    overallProgressPercent,
    progressDistribution: buildProgressDistributionFromProjects(projects),
    progressTrend: buildProgressTrendFromProjects(projects, monthlyProgress),
    projects,
    latestTour,
    latestDocuments,
    openIssuesList,
    upcomingMilestones,
    monthlyProgress,
  };
}

function filterDashboardProjects(
  projects: ProjectWithMeta[],
  scope: WorkspaceScope
): ProjectWithMeta[] {
  let list = projects;
  if (scope.clientId) {
    list = list.filter((p) => p.client_id === scope.clientId);
  }
  if (scope.projectId) {
    list = list.filter((p) => p.id === scope.projectId);
  }
  return list;
}

function buildProgressDistributionFromProjects(projects: ProjectWithMeta[]) {
  const categories = {
    Completed: 0,
    "In Progress": 0,
    "On Hold": 0,
    "Not Started": 0,
  };

  projects.forEach((project) => {
    if (project.status === "completed") categories.Completed += 1;
    else if (project.status === "in_progress") categories["In Progress"] += 1;
    else if (project.status === "on_hold") categories["On Hold"] += 1;
    else categories["Not Started"] += 1;
  });

  const total = projects.length || 1;
  return Object.entries(categories).map(([name, value]) => ({
    name,
    value,
    percent: projects.length > 0 ? Math.round((value / total) * 100) : 0,
  }));
}

function buildProgressTrendFromProjects(
  projects: ProjectWithMeta[],
  monthlyProgress: { month: string; count: number }[]
) {
  const target =
    projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0;

  if (target === 0) {
    return monthlyProgress.map((entry) => ({ month: entry.month, progress: 0 }));
  }

  const totalActivity = monthlyProgress.reduce((sum, entry) => sum + entry.count, 0) || 1;
  let cumulative = 0;

  return monthlyProgress.map((entry) => {
    cumulative += entry.count;
    const ratio = cumulative / totalActivity;
    const progress = Math.max(5, Math.round(ratio * target));
    return { month: entry.month, progress: Math.min(progress, target) };
  });
}
