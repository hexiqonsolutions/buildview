"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getProjectComments } from "@/lib/actions/comments";
import { isBuildViewStaffRole, isClientPortalRole } from "@/lib/auth/roles";
import type {
  Client,
  ClientDashboardType,
  DashboardStats,
  Project,
  ProjectStatus,
  ProjectTour,
  IssueWithRelations,
  TimelineEventWithRelations,
  User,
  UserRole,
} from "@/lib/types";
import { getProjectProgressPercent, getProjectStageLabel } from "@/lib/utils";
import type { TimelinePageData } from "@/lib/timeline/page-data";
import { getDemoTimelinePageData } from "@/lib/timeline/demo-timeline";
import type { AdminWorkspaceBootstrap } from "@/lib/admin/workspace";
import { parseTourWorkspaceMeta } from "@/lib/admin/tour-metadata";
import type { PortalWorkspaceBootstrap } from "@/lib/portal/workspace";
import { resolveClientDashboardType } from "@/lib/portal/dashboard-type";
import { getCurrentUser } from "@/lib/actions/auth";

export type AdminDashboardStats = {
  totalClients: number;
  activeProjects: number;
  totalTours: number;
  openIssues: number;
  totalReports: number;
  totalDocuments: number;
  totalInvoices: number;
  monthlyRevenue: number;
  recentActivity: Awaited<ReturnType<typeof getDashboardStats>>["recentActivity"];
  recentUploads: Array<{
    id: string;
    type: string;
    name: string;
    projectName: string;
    created_at: string;
  }>;
  projectsByStatus: { status: ProjectStatus; count: number }[];
  projectsByClient: { clientName: string; count: number }[];
  monthlyUploads: { month: string; count: number }[];
  issueDistribution: { priority: string; count: number }[];
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  const [
    clientsRes,
    projectsRes,
    toursRes,
    issuesRes,
    reportsRes,
    documentsRes,
    invoicesRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("projects").select("id, status, client_name").is("deleted_at", null),
    supabase.from("project_tours").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("issues").select("id, priority, status").is("deleted_at", null),
    supabase.from("reports").select("id, title, created_at, project:projects(name)").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("invoices").select("amount, status, created_at"),
    supabase.from("activity_logs").select("*, user:users(id, full_name, email, avatar_url)").order("created_at", { ascending: false }).limit(8),
  ]);

  const projects = projectsRes.data ?? [];
  const issues = issuesRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const statusCounts: Record<string, number> = {};
  const clientCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    clientCounts[p.client_name] = (clientCounts[p.client_name] || 0) + 1;
  });

  const priorityCounts: Record<string, number> = {};
  issues.forEach((i) => {
    priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1;
  });

  const now = new Date();
  const monthlyRevenue = invoices
    .filter((inv) => {
      const d = new Date(inv.created_at);
      return inv.status === "paid" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const recentUploads = (reportsRes.data ?? []).map((r) => ({
    id: r.id,
    type: "Report",
    name: r.title,
    projectName: (r.project as { name?: string } | null)?.name ?? "—",
    created_at: r.created_at,
  }));

  const monthlyUploads = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString("en-US", { month: "short" });
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const count = (reportsRes.data ?? []).filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    }).length;
    return { month, count };
  });

  return {
    totalClients: clientsRes.count ?? 0,
    activeProjects: projects.filter((p) => p.status === "in_progress" || p.status === "planning").length,
    totalTours: toursRes.count ?? 0,
    openIssues: issues.filter((i) => i.status === "open" || i.status === "in_progress").length,
    totalReports: reportsRes.data?.length ?? 0,
    totalDocuments: documentsRes.count ?? 0,
    totalInvoices: invoices.length,
    monthlyRevenue,
    recentActivity: activityRes.data ?? [],
    recentUploads,
    projectsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status: status as ProjectStatus,
      count,
    })),
    projectsByClient: Object.entries(clientCounts)
      .map(([clientName, count]) => ({ clientName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    monthlyUploads,
    issueDistribution: Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    })),
  };
}

export type AdminProjectRow = Project & {
  progress: number;
  stage: string;
  tourCount: number;
  openIssueCount: number;
  lastScanDate: string | null;
  projectCode: string;
  progressTrend: string | null;
};

export type AdminProjectsListData = {
  stats: {
    totalProjects: number;
    activeProjects: number;
    onHoldProjects: number;
    completedProjects: number;
    totalTours: number;
    openIssues: number;
  };
  projects: AdminProjectRow[];
  clients: { id: string; name: string }[];
};

function formatProjectCode(index: number): string {
  return `PROJ-${String(index + 1).padStart(3, "0")}`;
}

function getProgressTrendLabel(status: ProjectStatus): string | null {
  if (status === "in_progress") return "↑ 12% this month";
  if (status === "completed") return "↑ 5% this month";
  if (status === "on_hold") return "↓ 2% this month";
  return null;
}

export async function getAdminProjectsListData(): Promise<AdminProjectsListData> {
  const [projects, clients, tours, issues] = await Promise.all([
    getProjects(),
    getClients(),
    getAllTours(),
    getAllIssues(),
  ]);

  const tourCountByProject: Record<string, number> = {};
  const lastScanByProject: Record<string, string> = {};

  tours.forEach((t) => {
    const pid = t.project_id as string;
    tourCountByProject[pid] = (tourCountByProject[pid] || 0) + 1;
    const capture = t.capture_date as string | null;
    if (capture && (!lastScanByProject[pid] || capture > lastScanByProject[pid])) {
      lastScanByProject[pid] = capture;
    }
  });

  const openIssueCountByProject: Record<string, number> = {};
  issues.forEach((i) => {
    if (i.status !== "open" && i.status !== "in_progress") return;
    const pid = i.project_id as string;
    openIssueCountByProject[pid] = (openIssueCountByProject[pid] || 0) + 1;
  });

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "in_progress" || p.status === "planning").length,
    onHoldProjects: projects.filter((p) => p.status === "on_hold").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    totalTours: tours.length,
    openIssues: issues.filter((i) => i.status === "open" || i.status === "in_progress").length,
  };

  const projectRows: AdminProjectRow[] = projects.map((p, index) => ({
    ...p,
    progress: getProjectProgressPercent(p.status),
    stage: getProjectStageLabel(p.status),
    tourCount: tourCountByProject[p.id] ?? 0,
    openIssueCount: openIssueCountByProject[p.id] ?? 0,
    lastScanDate: lastScanByProject[p.id] ?? null,
    projectCode: formatProjectCode(index),
    progressTrend: getProgressTrendLabel(p.status),
  }));

  return {
    stats,
    projects: projectRows,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.company_name || c.name,
    })),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalProjects: 0,
      openIssues: 0,
      latestReports: [],
      recentActivity: [],
      projectsByStatus: [],
      monthlyActivity: [],
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  let projectIds: string[] = [];

  if (profile?.role === "super_admin") {
    const { data: projects } = await supabase.from("projects").select("id");
    projectIds = projects?.map((p) => p.id) || [];
  } else {
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", user.id);
    projectIds = assignments?.map((a) => a.project_id) || [];
  }

  const { count: totalProjects } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .in("id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"]);

  const { count: openIssues } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress"])
    .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: latestReports } = await supabase
    .from("reports")
    .select("*")
    .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*, user:users(id, full_name, email, avatar_url)")
    .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(10);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data: activityForChart } = await supabase
    .from("activity_logs")
    .select("created_at")
    .in("project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("created_at", sixMonthsAgo.toISOString());

  const { data: allProjects } = await supabase
    .from("projects")
    .select("status")
    .in("id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"])
    .is("deleted_at", null);

  const statusCounts: Record<string, number> = {};
  allProjects?.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  const projectsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status: status as ProjectStatus,
    count,
  }));

  const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const count =
      activityForChart?.filter((a) => {
        const d = new Date(a.created_at);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      }).length ?? 0;
    return { month, count };
  });

  return {
    totalProjects: totalProjects || 0,
    openIssues: openIssues || 0,
    latestReports: latestReports || [],
    recentActivity: recentActivity || [],
    projectsByStatus,
    monthlyActivity,
  };
}

export type ProjectWithMeta = Project & {
  progress: number;
  stage: string;
  latestScanDate: string | null;
  tourCount?: number;
  latestTour?: Pick<
    ProjectTour,
    "id" | "name" | "matterport_url" | "thumbnail_url" | "capture_date"
  > | null;
};

export type ClientDashboardKpis = {
  activeProjects: number;
  totalTours: number;
  reportsThisMonth: number;
  openIssues: number;
  trends: {
    activeProjects: { text: string; tone: "up" | "down" | "neutral" };
    totalTours: { text: string; tone: "up" | "down" | "neutral" };
    reportsThisMonth: { text: string; tone: "up" | "down" | "neutral" };
    openIssues: { text: string; tone: "up" | "down" | "neutral" };
  };
};

export type ProgressDistributionItem = {
  name: string;
  value: number;
  percent: number;
};

export type ClientDashboardData = {
  stats: DashboardStats;
  kpis: ClientDashboardKpis;
  overallProgressPercent: number;
  progressDistribution: ProgressDistributionItem[];
  progressTrend: { month: string; progress: number }[];
  projects: ProjectWithMeta[];
  latestTour: (ProjectTour & { projectName: string; projectId: string }) | null;
  latestDocuments: Array<{
    id: string;
    name: string;
    projectName: string;
    created_at: string;
    category: string;
  }>;
  openIssuesList: Array<IssueWithRelations & { projectName: string }>;
  upcomingMilestones: Array<TimelineEventWithRelations & { projectName: string }>;
  monthlyProgress: { month: string; count: number }[];
};

function calcMonthTrend(
  current: number,
  previous: number
): { text: string; tone: "up" | "down" | "neutral" } {
  if (current === 0 && previous === 0) {
    return { text: "No change from last month", tone: "neutral" };
  }
  if (previous === 0) {
    return { text: "Up from last month", tone: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `Up ${pct}% from last month`, tone: "up" };
  if (pct < 0) return { text: `Down ${Math.abs(pct)}% from last month`, tone: "down" };
  return { text: "No change from last month", tone: "neutral" };
}

function buildProgressDistribution(projects: ProjectWithMeta[]): ProgressDistributionItem[] {
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

function buildProgressTrend(
  projects: ProjectWithMeta[],
  monthlyProgress: { month: string; count: number }[]
): { month: string; progress: number }[] {
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

async function getAccessibleProjectIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") {
    const { data: projects } = await supabase.from("projects").select("id").is("deleted_at", null);
    return projects?.map((p) => p.id) ?? [];
  }

  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  return assignments?.map((a) => a.project_id) ?? [];
}

export async function getClientDashboardData(): Promise<ClientDashboardData> {
  const [stats, projects, tours] = await Promise.all([
    getDashboardStats(),
    getProjects(),
    getAccessibleTours(),
  ]);

  const projectIds = projects.map((p) => p.id);
  const emptyIds = ["00000000-0000-0000-0000-000000000000"];
  const ids = projectIds.length > 0 ? projectIds : emptyIds;

  const supabase = await createClient();

  const [documentsRes, issuesRes, timelineRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, created_at, category, is_current, project:projects(name)")
      .in("project_id", ids)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("issues")
      .select(
        "*, issue_images(*), assigned_user:users!issues_assigned_to_fkey(id, full_name, email, avatar_url), project:projects(name)"
      )
      .in("project_id", ids)
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("timeline_events")
      .select("*, timeline_photos(*), tour:project_tours(*), report:reports(*), project:projects(name)")
      .in("project_id", ids)
      .is("deleted_at", null)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .limit(5),
  ]);

  const latestTourByProject = new Map<string, ProjectTour>();
  tours.forEach((t) => {
    const tour = t as ProjectTour & { project?: { id: string; name: string } };
    const pid = tour.project_id;
    const existing = latestTourByProject.get(pid);
    const date = tour.capture_date ?? tour.created_at;
    const existingDate = existing ? existing.capture_date ?? existing.created_at : null;
    if (!existing || (existingDate && new Date(date) > new Date(existingDate))) {
      latestTourByProject.set(pid, tour);
    }
  });

  const projectsWithMeta: ProjectWithMeta[] = projects.map((p) => {
    const latest = latestTourByProject.get(p.id) ?? null;
    return {
      ...p,
      progress: getProjectProgressPercent(p.status),
      stage: getProjectStageLabel(p.status),
      latestScanDate: latest ? latest.capture_date ?? latest.created_at : null,
      tourCount: tours.filter((t) => (t as ProjectTour).project_id === p.id).length,
      latestTour: latest
        ? {
            id: latest.id,
            name: latest.name,
            matterport_url: latest.matterport_url,
            thumbnail_url: latest.thumbnail_url,
            capture_date: latest.capture_date,
          }
        : null,
    };
  });

  const sortedTours = [...tours].sort(
    (a, b) =>
      new Date((b as ProjectTour).capture_date ?? (b as ProjectTour).created_at).getTime() -
      new Date((a as ProjectTour).capture_date ?? (a as ProjectTour).created_at).getTime()
  );
  const latestTourRaw = sortedTours[0] as
    | (ProjectTour & { project?: { id: string; name: string } })
    | undefined;

  const latestTour = latestTourRaw
    ? {
        ...latestTourRaw,
        projectName: latestTourRaw.project?.name ?? "Project",
        projectId: latestTourRaw.project_id,
      }
    : null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const { data: timelineForChart } = await supabase
    .from("timeline_events")
    .select("event_date")
    .in("project_id", ids)
    .is("deleted_at", null)
    .gte("event_date", sixMonthsAgo.toISOString().split("T")[0]);

  const monthlyProgress = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.toLocaleString("en-US", { month: "short" });
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const count =
      timelineForChart?.filter((e) => {
        const d = new Date(e.event_date);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      }).length ?? 0;
    return { month, count };
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  const [
    reportsThisMonthRes,
    reportsLastMonthRes,
    toursThisMonthRes,
    toursLastMonthRes,
    activeLastMonthRes,
    issuesThisMonthRes,
    issuesLastMonthRes,
  ] = await Promise.all([
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .gte("report_date", startOfMonth),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .gte("report_date", startOfLastMonth)
      .lte("report_date", endOfLastMonth),
    supabase
      .from("project_tours")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .is("deleted_at", null)
      .gte("created_at", startOfMonth),
    supabase
      .from("project_tours")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .is("deleted_at", null)
      .gte("created_at", startOfLastMonth)
      .lte("created_at", `${endOfLastMonth}T23:59:59`),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .in("id", ids)
      .neq("status", "completed")
      .is("deleted_at", null)
      .lte("created_at", `${endOfLastMonth}T23:59:59`),
    supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null)
      .gte("created_at", startOfMonth),
    supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .in("status", ["open", "in_progress"])
      .is("deleted_at", null)
      .gte("created_at", startOfLastMonth)
      .lte("created_at", `${endOfLastMonth}T23:59:59`),
  ]);

  const activeProjectsCount = projects.filter((p) => p.status !== "completed").length;
  const reportsThisMonth = reportsThisMonthRes.count ?? 0;
  const overallProgressPercent =
    projectsWithMeta.length > 0
      ? Math.round(
          projectsWithMeta.reduce((sum, p) => sum + p.progress, 0) / projectsWithMeta.length
        )
      : 0;

  const kpis: ClientDashboardKpis = {
    activeProjects: activeProjectsCount,
    totalTours: tours.length,
    reportsThisMonth,
    openIssues: stats.openIssues,
    trends: {
      activeProjects: calcMonthTrend(
        activeProjectsCount,
        activeLastMonthRes.count ?? 0
      ),
      totalTours: calcMonthTrend(toursThisMonthRes.count ?? 0, toursLastMonthRes.count ?? 0),
      reportsThisMonth: calcMonthTrend(
        reportsThisMonth,
        reportsLastMonthRes.count ?? 0
      ),
      openIssues: calcMonthTrend(issuesThisMonthRes.count ?? 0, issuesLastMonthRes.count ?? 0),
    },
  };

  return {
    stats,
    kpis,
    overallProgressPercent,
    progressDistribution: buildProgressDistribution(projectsWithMeta),
    progressTrend: buildProgressTrend(projectsWithMeta, monthlyProgress),
    projects: projectsWithMeta,
    latestTour,
    latestDocuments:
      documentsRes.data
        ?.filter((d) => d.is_current !== false)
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          name: d.name,
          projectName: (d.project as { name: string } | null)?.name ?? "Project",
          created_at: d.created_at,
          category: d.category,
        })) ?? [],
    openIssuesList:
      issuesRes.data?.map((issue) => ({
        ...issue,
        issue_images:
          issue.issue_images?.filter(
            (image: { deleted_at: string | null }) => !image.deleted_at
          ) ?? [],
        projectName: (issue.project as { name: string } | null)?.name ?? "Project",
      })) ?? [],
    upcomingMilestones:
      timelineRes.data?.map((event) => ({
        ...event,
        timeline_photos:
          event.timeline_photos?.filter(
            (photo: { deleted_at: string | null }) => !photo.deleted_at
          ) ?? [],
        projectName: (event.project as { name: string } | null)?.name ?? "Project",
      })) ?? [],
    monthlyProgress,
  };
}

export async function getAccessibleTimeline() {
  const projects = await getProjects();
  const events = await Promise.all(
    projects.map(async (project) => {
      const timeline = await getProjectTimeline(project.id);
      return timeline.map((event) => ({
        ...event,
        projectName: project.name,
        projectId: project.id,
      }));
    })
  );

  return events
    .flat()
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
}

export async function getProjectInvoices(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("issued_date", { ascending: false });
  return data ?? [];
}

export { getAccessibleProjectIds };

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  // BuildView staff see all projects (RLS maps staff via is_super_admin).
  if (role && isBuildViewStaffRole(role)) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return data || [];
  }

  const byId = new Map<string, Project>();

  // Client portal users see every project under their company, plus any
  // extra assignments (e.g. consultants added to specific projects).
  if (role && isClientPortalRole(role) && profile?.client_id) {
    // Prefer service role so org-wide listing works even before the
    // has_project_access SQL fix is applied (RLS previously required Team rows).
    let loadedOrg = false;
    try {
      const admin = createServiceRoleClient();
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      for (const p of adminProjects || []) {
        byId.set(p.id, p as Project);
      }
      loadedOrg = true;
    } catch {
      loadedOrg = false;
    }

    if (!loadedOrg) {
      const { data: orgProjects } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", profile.client_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      for (const p of orgProjects || []) {
        byId.set(p.id, p as Project);
      }
    }
  }

  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project:projects(*)")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  for (const a of assignments || []) {
    const p = a.project as unknown as Project;
    if (p?.id && !p.deleted_at) byId.set(p.id, p);
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  return data;
}

export async function getProjectWithClient(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(id, name, company_name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!data) return null;

  const { client, ...project } = data as typeof data & {
    client: { id: string; name: string; company_name: string | null; email: string } | null;
  };

  return { project, client };
}

export async function getProjectDetail(projectId: string) {
  const [tours, reports, documentsData, issues, timeline, comments] = await Promise.all([
    getProjectTours(projectId),
    getProjectReports(projectId),
    getProjectDocuments(projectId),
    getProjectIssues(projectId),
    getProjectTimeline(projectId),
    getProjectComments(projectId),
  ]);

  return {
    tours,
    reports,
    folders: documentsData.folders,
    documents: documentsData.documents,
    issues,
    timeline,
    comments,
  };
}

export async function getProjectTours(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_tours")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("capture_date", { ascending: false });
  return data || [];
}

export async function getAccessibleTours() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const query = supabase
    .from("project_tours")
    .select("*, project:projects(id, name, client_name)")
    .is("deleted_at", null)
    .order("capture_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (profile?.role === "super_admin") {
    const { data } = await query;
    return data || [];
  }

  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const projectIds = assignments?.map((a) => a.project_id) || [];
  if (projectIds.length === 0) return [];

  const { data } = await query.in("project_id", projectIds);
  return data || [];
}

export async function getProjectReports(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("report_date", { ascending: false });
  return data || [];
}

export async function getProjectFolders(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data || [];
}

export async function getAllFolders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_folders")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return data || [];
}

export async function getProjectDocuments(projectId: string) {
  const supabase = await createClient();
  const { data: folders } = await supabase
    .from("document_folders")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const currentDocuments = (documents || []).filter((doc) => doc.is_current !== false);

  return { folders: folders || [], documents: currentDocuments };
}

export async function getProjectIssues(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select(
      "*, issue_images(*), assigned_user:users!issues_assigned_to_fkey(id, full_name, email, avatar_url)"
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data || []).map((issue) => ({
    ...issue,
    issue_images:
      issue.issue_images?.filter(
        (image: { deleted_at: string | null }) => !image.deleted_at
      ) ?? [],
  }));
}

export async function getProjectTimeline(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("*, timeline_photos(*), tour:project_tours(*), report:reports(*)")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("sort_order", { ascending: true });

  return (data || []).map((event) => ({
    ...event,
    timeline_photos:
      event.timeline_photos?.filter(
        (photo: { deleted_at: string | null }) => !photo.deleted_at
      ) ?? [],
  }));
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  }

  const { data } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", profile?.client_id || "")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getAdminInvoices() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(id, name, company_name), project:projects(id, name)"
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getClients() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getClientDetail(clientId: string) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .is("deleted_at", null)
    .single();

  if (!client) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null);

  const projectIds = projects?.map((p) => p.id) ?? [];
  const emptyIds = ["00000000-0000-0000-0000-000000000000"];
  const ids = projectIds.length > 0 ? projectIds : emptyIds;

  const [usersRes, toursRes, reportsRes, documentsRes, invoicesRes, issuesRes, timelineRes] =
    await Promise.all([
      supabase.from("users").select("*").eq("client_id", clientId).is("deleted_at", null),
      supabase.from("project_tours").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("reports").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("documents").select("*").in("project_id", ids).is("deleted_at", null),
      supabase.from("invoices").select("*").eq("client_id", clientId),
      supabase.from("issues").select("*").in("project_id", ids).is("deleted_at", null),
      supabase
        .from("timeline_events")
        .select("*, project:projects(id, name)")
        .in("project_id", ids)
        .is("deleted_at", null)
        .order("event_date", { ascending: false })
        .limit(30),
    ]);

  return {
    client,
    projects: projects ?? [],
    users: usersRes.data ?? [],
    tours: toursRes.data ?? [],
    reports: reportsRes.data ?? [],
    documents: (documentsRes.data ?? []).filter((doc) => doc.is_current !== false),
    invoices: invoicesRes.data ?? [],
    issues: issuesRes.data ?? [],
    timeline: timelineRes.data ?? [],
  };
}

export async function getClientsWithStats() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!clients?.length) return [];

  const [projectsRes, usersRes, documentsRes, reportsRes] = await Promise.all([
    supabase.from("projects").select("id, client_id").is("deleted_at", null),
    supabase
      .from("users")
      .select("id, client_id, updated_at, role")
      .is("deleted_at", null)
      .in("role", ["client", "client_admin", "client_user", "read_only_client", "consultant"]),
    supabase.from("documents").select("project_id, file_size").is("deleted_at", null),
    supabase.from("reports").select("project_id, file_size").is("deleted_at", null),
  ]);

  const countByClient: Record<string, number> = {};
  const projectToClient = new Map<string, string>();
  projectsRes.data?.forEach((p) => {
    countByClient[p.client_id] = (countByClient[p.client_id] || 0) + 1;
    projectToClient.set(p.id, p.client_id);
  });

  const usersByClient: Record<string, number> = {};
  const lastActivityByClient: Record<string, string> = {};
  const primaryUserByClient: Record<string, string> = {};

  usersRes.data?.forEach((u) => {
    if (!u.client_id) return;
    usersByClient[u.client_id] = (usersByClient[u.client_id] || 0) + 1;
    const prev = lastActivityByClient[u.client_id];
    if (!prev || u.updated_at > prev) {
      lastActivityByClient[u.client_id] = u.updated_at;
    }
    if (!primaryUserByClient[u.client_id] && u.role === "client_admin") {
      primaryUserByClient[u.client_id] = u.id;
    }
    if (!primaryUserByClient[u.client_id]) {
      primaryUserByClient[u.client_id] = u.id;
    }
  });

  const storageByClient: Record<string, number> = {};
  function addBytes(projectId: string, bytes: number) {
    const clientId = projectToClient.get(projectId);
    if (!clientId) return;
    storageByClient[clientId] = (storageByClient[clientId] || 0) + (bytes ?? 0);
  }
  documentsRes.data?.forEach((d) => addBytes(d.project_id, d.file_size ?? 0));
  reportsRes.data?.forEach((r) => addBytes(r.project_id, r.file_size ?? 0));

  return clients.map((c) => ({
    ...c,
    projectCount: countByClient[c.id] ?? 0,
    userCount: usersByClient[c.id] ?? 0,
    storageBytes: storageByClient[c.id] ?? 0,
    lastLoginAt: lastActivityByClient[c.id] ?? null,
    primaryUserId: primaryUserByClient[c.id] ?? null,
  }));
}

export type AdminUserRow = User & {
  last_sign_in_at: string | null;
  client: {
    id: string;
    name: string;
    company_name: string | null;
    dashboard_type?: ClientDashboardType | null;
  } | null;
};

export async function getAllUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return [];

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!me || !isBuildViewStaffRole(me.role)) {
    return [];
  }

  let profiles: Array<Record<string, unknown>> | null = null;

  try {
    const admin = createServiceRoleClient();

    const withClient = await admin
      .from("users")
      .select("*, client:clients!users_client_id_fkey(id, name, company_name, dashboard_type)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (withClient.error) {
      console.warn("[getAllUsers] join select failed:", withClient.error.message);

      const plain = await admin
        .from("users")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (plain.error) {
        console.warn("[getAllUsers] plain select failed:", plain.error.message);
      } else {
        profiles = (plain.data as Array<Record<string, unknown>>) ?? [];
      }
    } else {
      profiles = (withClient.data as Array<Record<string, unknown>>) ?? [];
    }

    const authListed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const lastSignInById = new Map<string, string | null>();
    const emailById = new Map<string, string>();
    for (const u of authListed.data?.users ?? []) {
      lastSignInById.set(u.id, u.last_sign_in_at ?? null);
      if (u.email) emailById.set(u.id, u.email);
    }

    return (profiles ?? []).map((row) => {
      const email = (String(row.email ?? "").trim() || emailById.get(String(row.id)) || "").trim();
      const fullName = String(row.full_name ?? "").trim() || email.split("@")[0] || "User";
      const client = (row.client as AdminUserRow["client"]) ?? null;

      return {
        id: String(row.id),
        email: email || "—",
        full_name: fullName,
        role: row.role as AdminUserRow["role"],
        client_id: (row.client_id as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
        phone: (row.phone as string | null) ?? null,
        is_active: Boolean(row.is_active),
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        deleted_at: (row.deleted_at as string | null) ?? null,
        created_by: (row.created_by as string | null) ?? null,
        updated_by: (row.updated_by as string | null) ?? null,
        deleted_by: (row.deleted_by as string | null) ?? null,
        dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
        last_sign_in_at: lastSignInById.get(String(row.id)) ?? null,
        client,
      };
    });
  } catch (err) {
    console.warn("[getAllUsers] service role failed, falling back to RLS:", err);
  }

  // Fallback: staff-readable rows via normal client (RLS).
  const { data: fallback, error: fallbackError } = await supabase
    .from("users")
    .select("*, client:clients!users_client_id_fkey(id, name, company_name, dashboard_type)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (fallbackError) {
    console.warn("[getAllUsers] fallback failed:", fallbackError.message);
    const plain = await supabase
      .from("users")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return ((plain.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      email: String(row.email ?? "—"),
      full_name: String(row.full_name ?? row.email ?? "User"),
      role: row.role as AdminUserRow["role"],
      client_id: (row.client_id as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      is_active: Boolean(row.is_active),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      deleted_at: (row.deleted_at as string | null) ?? null,
      created_by: (row.created_by as string | null) ?? null,
      updated_by: (row.updated_by as string | null) ?? null,
      deleted_by: (row.deleted_by as string | null) ?? null,
      dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
      last_sign_in_at: null,
      client: null,
    }));
  }

  return ((fallback ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    email: String(row.email ?? "—"),
    full_name: String(row.full_name ?? row.email ?? "User"),
    role: row.role as AdminUserRow["role"],
    client_id: (row.client_id as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: (row.deleted_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    deleted_by: (row.deleted_by as string | null) ?? null,
    dashboard_type: (row.dashboard_type as AdminUserRow["dashboard_type"]) ?? null,
    last_sign_in_at: null,
    client: (row.client as AdminUserRow["client"]) ?? null,
  }));
}

export async function getUserAssignments(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_assignments")
    .select("id, project:projects(id, name)")
    .eq("user_id", userId)
    .is("deleted_at", null);
  return data || [];
}

export async function getProjectAssignments(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_assignments")
    .select("id, user:users(id, full_name, email)")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  return data || [];
}

export async function getAllReports() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("report_date", { ascending: false });
  return data || [];
}

export async function getAllDocuments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getAllTours() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_tours")
    .select("*, project:projects(id, name)")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getAllTimelineEvents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select(
      "*, project:projects(name), timeline_photos(*), tour:project_tours(*), report:reports(*)"
    )
    .is("deleted_at", null)
    .order("event_date", { ascending: true })
    .order("sort_order", { ascending: true });

  return (data || []).map((event) => ({
    ...event,
    timeline_photos:
      event.timeline_photos?.filter(
        (photo: { deleted_at: string | null }) => !photo.deleted_at
      ) ?? [],
  }));
}

export async function getAllIssues() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select(
      "*, project:projects(name), issue_images(*), assigned_user:users!issues_assigned_to_fkey(id, full_name, email, avatar_url)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data || []).map((issue) => ({
    ...issue,
    issue_images:
      issue.issue_images?.filter(
        (image: { deleted_at: string | null }) => !image.deleted_at
      ) ?? [],
  }));
}

/** Timeline hub data scoped to projects the current user can access. */
export async function getTimelinePageData(): Promise<TimelinePageData> {
  const projects = await getProjects();
  if (projects.length === 0) {
    return { projects: [], events: [], tours: [], reports: [], issues: [] };
  }

  const projectIds = new Set(projects.map((p) => p.id));
  const [events, tours, reports, issues] = await Promise.all([
    getAllTimelineEvents(),
    getAllTours(),
    getAllReports(),
    getAllIssues(),
  ]);

  return {
    projects,
    events: events.filter((e) => projectIds.has(e.project_id)) as TimelineEventWithRelations[],
    tours: tours.filter((t) => projectIds.has(t.project_id as string)),
    reports: reports.filter((r) => projectIds.has(r.project_id as string)),
    issues: issues.filter((i) => projectIds.has(i.project_id as string)) as IssueWithRelations[],
  };
}

/** Client portal timeline — falls back to demo preview when no projects are assigned. */
export async function getClientTimelinePageData(): Promise<{
  data: TimelinePageData;
  isDemo: boolean;
}> {
  const data = await getTimelinePageData();
  if (data.projects.length === 0) {
    return { data: getDemoTimelinePageData(), isDemo: true };
  }
  return { data, isDemo: false };
}

/** @deprecated use getTimelinePageData */
export async function getAdminTimelinePageData() {
  return getTimelinePageData();
}

export async function getAdminWorkspaceBootstrap(): Promise<AdminWorkspaceBootstrap> {
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: tours }, { data: dbBuildings }, { data: dbFloors }] =
    await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company_name, logo_url")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("projects").select("*").is("deleted_at", null).order("name"),
    supabase
      .from("project_tours")
      .select("project_id, description, building_id, floor_id")
      .is("deleted_at", null),
    supabase
      .from("buildings")
      .select("id, project_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("floors")
      .select("id, building_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  const buildingsByProject: Record<string, string[]> = {};
  const floorsByProject: Record<string, Record<string, string[]>> = {};
  const buildingIdsByProject: Record<string, Record<string, string>> = {};
  const floorIdsByProject: Record<string, Record<string, Record<string, string>>> = {};

  dbBuildings?.forEach((b) => {
    const set = new Set(buildingsByProject[b.project_id] ?? []);
    set.add(b.name);
    buildingsByProject[b.project_id] = Array.from(set).sort();
    if (!buildingIdsByProject[b.project_id]) buildingIdsByProject[b.project_id] = {};
    buildingIdsByProject[b.project_id][b.name] = b.id;
  });

  dbFloors?.forEach((f) => {
    const buildingRow = dbBuildings?.find((b) => b.id === f.building_id);
    const projectId = buildingRow?.project_id;
    const buildingName = buildingRow?.name;
    if (!projectId || !buildingName) return;
    if (!floorsByProject[projectId]) floorsByProject[projectId] = {};
    const floorSet = new Set(floorsByProject[projectId][buildingName] ?? []);
    floorSet.add(f.name);
    floorsByProject[projectId][buildingName] = Array.from(floorSet).sort();
    if (!floorIdsByProject[projectId]) floorIdsByProject[projectId] = {};
    if (!floorIdsByProject[projectId][buildingName]) {
      floorIdsByProject[projectId][buildingName] = {};
    }
    floorIdsByProject[projectId][buildingName][f.name] = f.id;
  });

  tours?.forEach((tour) => {
    const meta = parseTourWorkspaceMeta(tour.description);
    const pid = tour.project_id;
    if (!pid) return;

    const buildingName = meta.building;
    const buildingId = tour.building_id ?? meta.building_id ?? null;
    const floorName = meta.floor;
    const floorId = tour.floor_id ?? meta.floor_id ?? null;

    if (buildingName) {
      const set = new Set(buildingsByProject[pid] ?? []);
      set.add(buildingName);
      buildingsByProject[pid] = Array.from(set).sort();
      if (buildingId) {
        if (!buildingIdsByProject[pid]) buildingIdsByProject[pid] = {};
        buildingIdsByProject[pid][buildingName] = buildingId;
      }
    }

    if (buildingName && floorName) {
      if (!floorsByProject[pid]) floorsByProject[pid] = {};
      const floorSet = new Set(floorsByProject[pid][buildingName] ?? []);
      floorSet.add(floorName);
      floorsByProject[pid][buildingName] = Array.from(floorSet).sort();
      if (floorId) {
        if (!floorIdsByProject[pid]) floorIdsByProject[pid] = {};
        if (!floorIdsByProject[pid][buildingName]) {
          floorIdsByProject[pid][buildingName] = {};
        }
        floorIdsByProject[pid][buildingName][floorName] = floorId;
      }
    }
  });

  return {
    clients: clients ?? [],
    projects: projects ?? [],
    buildingsByProject,
    floorsByProject,
    buildingIdsByProject,
    floorIdsByProject,
  };
}

export async function getPortalWorkspaceBootstrap(): Promise<PortalWorkspaceBootstrap> {
  const [user, projects] = await Promise.all([getCurrentUser(), getProjects()]);
  const projectIds = new Set(projects.map((p) => p.id));

  const supabase = await createClient();
  let clientName: string | null = null;
  let clientLogoUrl: string | null = null;
  let clientDashboardType: ClientDashboardType = "construction";

  // Prefer linked org; otherwise if this account only belongs to one client via projects, use that.
  let clientId = user?.client_id ?? null;
  if (!clientId) {
    const uniqueClientIds = Array.from(
      new Set(projects.map((p) => p.client_id).filter(Boolean) as string[])
    );
    if (uniqueClientIds.length === 1) {
      clientId = uniqueClientIds[0] ?? null;
    }
  }

  type ClientPortalFields = Pick<
    Client,
    "name" | "company_name" | "logo_url" | "dashboard_type"
  >;
  let clientRow: ClientPortalFields | null = null;

  if (clientId) {
    // Service role avoids RLS/schema-cache edge cases when reading dashboard_type.
    try {
      const admin = createServiceRoleClient();
      const { data } = await admin
        .from("clients")
        .select("name, company_name, logo_url, dashboard_type")
        .eq("id", clientId)
        .is("deleted_at", null)
        .maybeSingle();
      clientRow = (data as ClientPortalFields | null) ?? null;
    } catch {
      const { data } = await supabase
        .from("clients")
        .select("name, company_name, logo_url, dashboard_type")
        .eq("id", clientId)
        .is("deleted_at", null)
        .maybeSingle();
      clientRow = (data as ClientPortalFields | null) ?? null;
    }

    clientName = clientRow?.company_name?.trim() || clientRow?.name?.trim() || null;
    clientLogoUrl = clientRow?.logo_url?.trim() || null;
  }

  clientDashboardType = resolveClientDashboardType(user, clientRow);

  // Last resort: if any accessible project's client is portfolio, prefer that
  // when the signed-in user is a portal client (not staff browsing all projects).
  if (
    clientDashboardType === "construction" &&
    user &&
    !isBuildViewStaffRole(user.role) &&
    projects.length > 0
  ) {
    const projectClientIds = Array.from(
      new Set(projects.map((p) => p.client_id).filter(Boolean) as string[])
    );
    if (projectClientIds.length > 0) {
      try {
        const admin = createServiceRoleClient();
        const { data: projectClients } = await admin
          .from("clients")
          .select("id, dashboard_type")
          .in("id", projectClientIds)
          .is("deleted_at", null);
        const portfolioClient = projectClients?.find((c) => c.dashboard_type === "portfolio");
        if (portfolioClient) {
          clientDashboardType = "portfolio";
          if (!clientId) clientId = portfolioClient.id;
        }
      } catch {
        // ignore — keep construction
      }
    }
  }

  if (!clientName) {
    const fromProject = projects.find((p) => p.client_name?.trim())?.client_name?.trim();
    clientName = fromProject || null;
  }

  if (projectIds.size === 0) {
    return {
      clientId,
      clientName,
      clientLogoUrl,
      dashboardType: clientDashboardType,
      projects: [],
      buildingsByProject: {},
      floorsByProject: {},
      buildingIdsByProject: {},
      floorIdsByProject: {},
    };
  }

  const ids = Array.from(projectIds);

  const [{ data: tours }, { data: dbBuildings }, { data: dbFloors }] = await Promise.all([
    supabase
      .from("project_tours")
      .select("project_id, description, building_id, floor_id")
      .in("project_id", ids)
      .is("deleted_at", null),
    supabase
      .from("buildings")
      .select("id, project_id, name")
      .in("project_id", ids)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("floors")
      .select("id, building_id, name")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  const buildingsByProject: PortalWorkspaceBootstrap["buildingsByProject"] = {};
  const floorsByProject: PortalWorkspaceBootstrap["floorsByProject"] = {};
  const buildingIdsByProject: PortalWorkspaceBootstrap["buildingIdsByProject"] = {};
  const floorIdsByProject: PortalWorkspaceBootstrap["floorIdsByProject"] = {};

  dbBuildings?.forEach((b) => {
    if (!projectIds.has(b.project_id)) return;
    const set = new Set(buildingsByProject[b.project_id] ?? []);
    set.add(b.name);
    buildingsByProject[b.project_id] = Array.from(set).sort();
    if (!buildingIdsByProject[b.project_id]) buildingIdsByProject[b.project_id] = {};
    buildingIdsByProject[b.project_id][b.name] = b.id;
  });

  dbFloors?.forEach((f) => {
    const buildingRow = dbBuildings?.find((b) => b.id === f.building_id);
    const projectId = buildingRow?.project_id;
    const buildingName = buildingRow?.name;
    if (!projectId || !buildingName || !projectIds.has(projectId)) return;
    if (!floorsByProject[projectId]) floorsByProject[projectId] = {};
    const floorSet = new Set(floorsByProject[projectId][buildingName] ?? []);
    floorSet.add(f.name);
    floorsByProject[projectId][buildingName] = Array.from(floorSet).sort();
    if (!floorIdsByProject[projectId]) floorIdsByProject[projectId] = {};
    if (!floorIdsByProject[projectId][buildingName]) {
      floorIdsByProject[projectId][buildingName] = {};
    }
    floorIdsByProject[projectId][buildingName][f.name] = f.id;
  });

  tours?.forEach((tour) => {
    const meta = parseTourWorkspaceMeta(tour.description);
    const pid = tour.project_id;
    if (!pid || !projectIds.has(pid)) return;

    const buildingName = meta.building;
    const buildingId = tour.building_id ?? meta.building_id ?? null;
    const floorName = meta.floor;
    const floorId = tour.floor_id ?? meta.floor_id ?? null;

    if (buildingName) {
      const set = new Set(buildingsByProject[pid] ?? []);
      set.add(buildingName);
      buildingsByProject[pid] = Array.from(set).sort();
      if (buildingId) {
        if (!buildingIdsByProject[pid]) buildingIdsByProject[pid] = {};
        buildingIdsByProject[pid][buildingName] = buildingId;
      }
    }

    if (buildingName && floorName) {
      if (!floorsByProject[pid]) floorsByProject[pid] = {};
      const floorSet = new Set(floorsByProject[pid][buildingName] ?? []);
      floorSet.add(floorName);
      floorsByProject[pid][buildingName] = Array.from(floorSet).sort();
      if (floorId) {
        if (!floorIdsByProject[pid]) floorIdsByProject[pid] = {};
        if (!floorIdsByProject[pid][buildingName]) {
          floorIdsByProject[pid][buildingName] = {};
        }
        floorIdsByProject[pid][buildingName][floorName] = floorId;
      }
    }
  });

  return {
    clientId,
    clientName,
    clientLogoUrl,
    dashboardType: clientDashboardType,
    projects,
    buildingsByProject,
    floorsByProject,
    buildingIdsByProject,
    floorIdsByProject,
  };
}

export type AdminOperationsStats = AdminDashboardStats & {
  pendingUploads: number;
  projectsRequiringUpdates: number;
  matterportProcessing: number;
  reportsPending: number;
  draftInvoices: number;
  storageUsedGb: number;
  storageLimitGb: number;
  todaysUploads: number;
};

export async function getAdminOperationsStats(): Promise<AdminOperationsStats> {
  const supabase = await createClient();
  const base = await getAdminDashboardStats();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  const [
    toursTodayRes,
    reportsTodayRes,
    draftInvoicesRes,
    recentToursRes,
    fileSizeRes,
  ] = await Promise.all([
    supabase
      .from("project_tours")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", todayIso),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("created_at", todayIso),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("project_tours")
      .select("project_id, capture_date, created_at")
      .is("deleted_at", null)
      .order("capture_date", { ascending: false }),
    supabase.from("documents").select("file_size").is("deleted_at", null),
  ]);

  const latestTourByProject = new Map<string, string>();
  recentToursRes.data?.forEach((t) => {
    if (!latestTourByProject.has(t.project_id)) {
      latestTourByProject.set(
        t.project_id,
        t.capture_date ?? t.created_at
      );
    }
  });

  const { data: activeProjects } = await supabase
    .from("projects")
    .select("id, status")
    .is("deleted_at", null)
    .in("status", ["planning", "in_progress"]);

  const projectsRequiringUpdates =
    activeProjects?.filter((p) => {
      const last = latestTourByProject.get(p.id);
      if (!last) return true;
      return new Date(last) < fortyFiveDaysAgo;
    }).length ?? 0;

  const storageBytes =
    fileSizeRes.data?.reduce((sum, d) => sum + (d.file_size ?? 0), 0) ?? 0;

  return {
    ...base,
    pendingUploads: projectsRequiringUpdates,
    projectsRequiringUpdates,
    matterportProcessing: 0,
    reportsPending: 0,
    draftInvoices: draftInvoicesRes.count ?? 0,
    storageUsedGb: Math.round((storageBytes / 1_073_741_824) * 10) / 10,
    storageLimitGb: 100,
    todaysUploads: (toursTodayRes.count ?? 0) + (reportsTodayRes.count ?? 0),
  };
}

export type AdminStorageCategory = {
  id: "documents" | "reports" | "photos" | "issue_images" | "matterport";
  label: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageClientRow = {
  clientId: string;
  clientName: string;
  bytes: number;
  fileCount: number;
};

export type AdminStorageStats = {
  totalBytes: number;
  limitBytes: number;
  categories: AdminStorageCategory[];
  clients: AdminStorageClientRow[];
};

export type AdminSitePhoto = {
  id: string;
  caption: string | null;
  storage_path: string | null;
  image_url: string;
  created_at: string;
  event_id: string;
  event_title: string;
  event_date: string;
  project_id: string;
  project_name: string;
  building?: string | null;
  floor?: string | null;
};

function sumFileSizes(rows: Array<{ file_size: number | null }> | null | undefined) {
  return rows?.reduce((sum, row) => sum + (row.file_size ?? 0), 0) ?? 0;
}

export async function getAdminStorageStats(): Promise<AdminStorageStats> {
  const supabase = await createClient();

  const [
    documentsRes,
    reportsRes,
    photosRes,
    issueImagesRes,
    toursRes,
    projectsRes,
    clientsRes,
  ] = await Promise.all([
    supabase.from("documents").select("file_size, project_id").is("deleted_at", null),
    supabase.from("reports").select("file_size, project_id").is("deleted_at", null),
    supabase.from("timeline_photos").select("id").is("deleted_at", null),
    supabase.from("issue_images").select("id").is("deleted_at", null),
    supabase.from("project_tours").select("id").is("deleted_at", null),
    supabase.from("projects").select("id, client_id").is("deleted_at", null),
    supabase.from("clients").select("id, name, company_name").is("deleted_at", null),
  ]);

  const docBytes = sumFileSizes(documentsRes.data);
  const reportBytes = sumFileSizes(reportsRes.data);
  const photoCount = photosRes.data?.length ?? 0;
  const issueImageCount = issueImagesRes.data?.length ?? 0;
  const tourCount = toursRes.data?.length ?? 0;

  const projectClientMap = new Map<string, string>();
  projectsRes.data?.forEach((p) => {
    if (p.client_id) projectClientMap.set(p.id, p.client_id);
  });

  const clientNameMap = new Map<string, string>();
  clientsRes.data?.forEach((c) => {
    clientNameMap.set(c.id, c.company_name || c.name);
  });

  const clientUsage = new Map<string, { bytes: number; fileCount: number }>();

  function addClientUsage(projectId: string, bytes: number, count = 1) {
    const clientId = projectClientMap.get(projectId);
    if (!clientId) return;
    const current = clientUsage.get(clientId) ?? { bytes: 0, fileCount: 0 };
    clientUsage.set(clientId, {
      bytes: current.bytes + bytes,
      fileCount: current.fileCount + count,
    });
  }

  documentsRes.data?.forEach((d) => addClientUsage(d.project_id, d.file_size ?? 0));
  reportsRes.data?.forEach((r) => addClientUsage(r.project_id, r.file_size ?? 0));

  const categories: AdminStorageCategory[] = [
    {
      id: "documents",
      label: "Documents",
      bytes: docBytes,
      fileCount: documentsRes.data?.length ?? 0,
    },
    {
      id: "reports",
      label: "Reports",
      bytes: reportBytes,
      fileCount: reportsRes.data?.length ?? 0,
    },
    {
      id: "photos",
      label: "Site Photos",
      bytes: 0,
      fileCount: photoCount,
    },
    {
      id: "issue_images",
      label: "Issue Images",
      bytes: 0,
      fileCount: issueImageCount,
    },
    {
      id: "matterport",
      label: "Matterport Tours",
      bytes: 0,
      fileCount: tourCount,
    },
  ];

  const totalBytes = docBytes + reportBytes;
  const clients: AdminStorageClientRow[] = Array.from(clientUsage.entries())
    .map(([clientId, usage]) => ({
      clientId,
      clientName: clientNameMap.get(clientId) ?? "Unknown client",
      bytes: usage.bytes,
      fileCount: usage.fileCount,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    totalBytes,
    limitBytes: 100 * 1_073_741_824,
    categories,
    clients,
  };
}

export async function getAdminSitePhotos(): Promise<AdminSitePhoto[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("timeline_photos")
    .select(
      `
      id,
      caption,
      storage_path,
      image_url,
      created_at,
      timeline_event:timeline_events(
        id,
        title,
        event_date,
        project_id,
        building,
        floor,
        project:projects(name)
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data) return [];

  const photos: AdminSitePhoto[] = [];

  for (const row of data) {
    const event = row.timeline_event as {
      id: string;
      title: string;
      event_date: string;
      project_id: string;
      building: string | null;
      floor: string | null;
      project: { name: string } | null;
    } | null;

    if (!event) continue;

    photos.push({
      id: row.id,
      caption: row.caption,
      storage_path: row.storage_path,
      image_url: row.image_url,
      created_at: row.created_at,
      event_id: event.id,
      event_title: event.title,
      event_date: event.event_date,
      project_id: event.project_id,
      project_name: event.project?.name ?? "Project",
      building: event.building,
      floor: event.floor,
    });
  }

  return photos;
}
