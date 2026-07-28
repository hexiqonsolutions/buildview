import type { WorkspaceScope } from "@/lib/admin/workspace";
import {
  filterBySpatialScope,
  filterToursByScope,
} from "@/lib/admin/scope";
import { normalizeWorkspaceScope } from "@/lib/admin/workspace-scope";
import { portalToAdminBootstrap } from "@/lib/portal/workspace";
import {
  averageProgress,
  buildLastSixMonthLabels,
  buildProgressDistribution,
  buildProgressTrendFromTimeline,
  countTimelineEventsByMonth,
  resolveProjectProgressValues,
} from "@/lib/portal/progress-metrics";
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

function hasSpatialWorkspaceFilter(scope: WorkspaceScope): boolean {
  return Boolean(
    scope.building !== "all" ||
      scope.floor !== "all" ||
      scope.buildingId ||
      scope.floorId
  );
}

function scopedTrendLabel(): { text: string; tone: "neutral" } {
  return { text: "Scoped to active workspace", tone: "neutral" };
}

/**
 * Construction portal home.
 * Always shows every project the client can access — header `?project=` is for
 * navigating into a project, not for hiding the rest on the dashboard (same as
 * portfolio home + Projects list).
 * Building/floor filters still narrow tours, reports, issues, and documents.
 */
export async function getPortalScopedDashboardData(
  scope: WorkspaceScope
): Promise<ClientDashboardData> {
  const bootstrap = await getPortalWorkspaceBootstrap();
  const normalized = normalizeWorkspaceScope(portalToAdminBootstrap(bootstrap), {
    ...scope,
    clientId: scope.clientId ?? bootstrap.clientId,
  });

  const spatialScope: WorkspaceScope = {
    ...normalized,
    projectId: null,
  };

  if (!hasSpatialWorkspaceFilter(spatialScope)) {
    return getClientDashboardData();
  }

  const base = await getClientDashboardData();
  const projects = filterDashboardProjects(base.projects, spatialScope);
  const projectIds = new Set(projects.map((p) => p.id));

  const [toursRaw, allDocs, allReports, allTimeline] = await Promise.all([
    getAccessibleTours(),
    getAllDocuments(),
    getAllReports(),
    getAllTimelineEvents(),
  ]);

  const scopedTours = filterToursByScope(
    toursRaw as ProjectTour[],
    spatialScope,
    projectIds
  );

  const openIssuesList = filterBySpatialScope(base.openIssuesList, spatialScope, projectIds);
  const upcomingMilestones = filterBySpatialScope(
    base.upcomingMilestones,
    spatialScope,
    projectIds
  );

  const scopedDocs = filterBySpatialScope(
    allDocs.filter((d) => d.is_current !== false),
    spatialScope,
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

  const scopedReports = filterBySpatialScope(allReports, spatialScope, projectIds);
  const reportsThisMonth = scopedReports.filter((r) => r.report_date >= startOfMonth).length;

  const activeProjects = projects.filter((p) => p.status !== "completed").length;
  const totalTours = scopedTours.length;
  const openIssues = openIssuesList.length;
  const scopedTimeline = filterBySpatialScope(allTimeline, spatialScope, projectIds);
  const progressByProject = resolveProjectProgressValues(projects, scopedTimeline);
  const overallProgressPercent = averageProgress(progressByProject);
  const monthlyLabels = buildLastSixMonthLabels();
  const monthlyProgress = countTimelineEventsByMonth(scopedTimeline, monthlyLabels);
  const projectsWithResolvedProgress = projects.map((project) => ({
    ...project,
    progress: progressByProject.get(project.id) ?? project.progress,
  }));

  const trend = scopedTrendLabel();

  return {
    ...base,
    stats: {
      ...base.stats,
      openIssues,
      latestReports: filterBySpatialScope(base.stats.latestReports, spatialScope, projectIds).slice(
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
    progressDistribution: buildProgressDistribution(projectsWithResolvedProgress),
    progressTrend: buildProgressTrendFromTimeline(
      projects.map((project) => project.id),
      scopedTimeline,
      monthlyLabels
    ),
    projects: projectsWithResolvedProgress,
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
  // Intentionally ignore scope.projectId — dashboard lists all client projects.
  return list;
}

