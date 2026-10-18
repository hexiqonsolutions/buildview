import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, InvoiceStatus, ProjectStatus, ProjectTour, IssueWithRelations, TimelineEventWithRelations } from "@/lib/types";
import {
  averageProgress,
  buildLastSixMonthLabels,
  buildProgressDistribution,
  buildProgressTrendFromTimeline,
  countTimelineEventsByMonth,
  resolveProjectProgressValues,
} from "@/lib/portal/progress-metrics";
import { requireStaffPermission } from "@/lib/auth/staff";
import { OPEN_ISSUE_STATUSES, isOpenIssueStatus } from "@/lib/issues/status";
import {
  type ProjectWithMeta,
  buildProjectsWithMeta,
  getProjectProgressEvents,
  getProjects,
} from "@/lib/data/projects";
import { idsOrNone } from "@/lib/data/query";
import { getAccessibleTours } from "@/lib/data/tours";
import { getStorageTotals } from "@/lib/data/storage";

export type AdminDashboardStats = {
  totalClients: number;
  activeProjects: number;
  totalTours: number;
  openIssues: number;
  totalReports: number;
  totalDocuments: number;
  totalInvoices: number;
  draftInvoices: number;
  monthlyRevenue: number;
  billedThisMonth: number;
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
  invoicesByStatus: { status: InvoiceStatus; count: number }[];
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireStaffPermission("read", "analytics");
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
    supabase.from("reports").select("id, title, created_at, project:projects(name)").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("documents").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("invoices")
      .select("amount, status, created_at, paid_date, issued_date")
      .is("deleted_at", null),
    supabase.from("activity_logs").select("*, user:users(id, full_name, email, avatar_url)").order("created_at", { ascending: false }).limit(8),
  ]);

  const projects = projectsRes.data ?? [];
  const issues = issuesRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const allReports = reportsRes.data ?? [];

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

  const invoiceStatusCounts: Record<string, number> = {};
  invoices.forEach((inv) => {
    invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] || 0) + 1;
  });

  const now = new Date();
  const isThisMonth = (iso: string | null | undefined) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const monthlyRevenue = invoices
    .filter((inv) => inv.status === "paid" && isThisMonth(inv.paid_date ?? inv.created_at))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Billed = anything issued this month except cancelled drafts that never went out.
  const billedThisMonth = invoices
    .filter(
      (inv) =>
        isThisMonth(inv.issued_date ?? inv.created_at) &&
        inv.status !== "cancelled" &&
        inv.status !== "draft"
    )
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const recentUploads = allReports.slice(0, 5).map((r) => ({
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
    const count = allReports.filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    }).length;
    return { month, count };
  });

  return {
    totalClients: clientsRes.count ?? 0,
    activeProjects: projects.filter((p) => p.status === "in_progress" || p.status === "planning").length,
    totalTours: toursRes.count ?? 0,
    openIssues: issues.filter((i) => isOpenIssueStatus(i.status)).length,
    totalReports: allReports.length,
    totalDocuments: documentsRes.count ?? 0,
    totalInvoices: invoices.length,
    draftInvoices: invoiceStatusCounts.draft ?? 0,
    monthlyRevenue,
    billedThisMonth,
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
    invoicesByStatus: Object.entries(invoiceStatusCounts).map(([status, count]) => ({
      status: status as InvoiceStatus,
      count,
    })),
  };
}

async function getDashboardStats(): Promise<DashboardStats> {
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
    .in("id", idsOrNone(projectIds));

  const { count: openIssues } = await supabase
    .from("issues")
    .select("*", { count: "exact", head: true })
    .in("status", OPEN_ISSUE_STATUSES)
    .in("project_id", idsOrNone(projectIds));

  const { data: latestReports } = await supabase
    .from("reports")
    .select("*")
    .in("project_id", idsOrNone(projectIds))
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select("*, user:users(id, full_name, email, avatar_url)")
    .in("project_id", idsOrNone(projectIds))
    .order("created_at", { ascending: false })
    .limit(10);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data: activityForChart } = await supabase
    .from("activity_logs")
    .select("created_at")
    .in("project_id", idsOrNone(projectIds))
    .gte("created_at", sixMonthsAgo.toISOString());

  const { data: allProjects } = await supabase
    .from("projects")
    .select("status")
    .in("id", idsOrNone(projectIds))
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

export async function getClientDashboardData(): Promise<ClientDashboardData> {
  const [stats, projects, tours] = await Promise.all([
    getDashboardStats(),
    getProjects(),
    getAccessibleTours(),
  ]);

  const projectIds = projects.map((p) => p.id);
  const ids = idsOrNone(projectIds);

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
      .in("status", OPEN_ISSUE_STATUSES)
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

  const timelineForChart = await getProjectProgressEvents(projectIds);
  const progressByProject = resolveProjectProgressValues(projects, timelineForChart);
  const projectsWithMeta = buildProjectsWithMeta(projects, tours as ProjectTour[], progressByProject);

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

  const monthlyLabels = buildLastSixMonthLabels();
  const monthlyProgress = countTimelineEventsByMonth(timelineForChart, monthlyLabels);

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
      .in("status", OPEN_ISSUE_STATUSES)
      .is("deleted_at", null)
      .gte("created_at", startOfMonth),
    supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .in("project_id", ids)
      .in("status", OPEN_ISSUE_STATUSES)
      .is("deleted_at", null)
      .gte("created_at", startOfLastMonth)
      .lte("created_at", `${endOfLastMonth}T23:59:59`),
  ]);

  const activeProjectsCount = projects.filter((p) => p.status !== "completed").length;
  const reportsThisMonth = reportsThisMonthRes.count ?? 0;
  const overallProgressPercent = averageProgress(progressByProject);

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
    progressTrend: buildProgressTrendFromTimeline(ids, timelineForChart, monthlyLabels),
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

export type AdminOperationsStats = AdminDashboardStats & {
  pendingUploads: number;
  projectsRequiringUpdates: number;
  matterportProcessing: number;
  reportsPending: number;
  storageUsedBytes: number;
  /** Included storage of the Supabase plan, or null when the plan isn't connected. */
  storageLimitBytes: number | null;
  todaysUploads: number;
};

export async function getAdminOperationsStats(): Promise<AdminOperationsStats> {
  await requireStaffPermission("read", "analytics");
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
    recentToursRes,
    storage,
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
      .from("project_tours")
      .select("project_id, capture_date, created_at")
      .is("deleted_at", null)
      .order("capture_date", { ascending: false }),
    getStorageTotals(),
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

  return {
    ...base,
    pendingUploads: projectsRequiringUpdates,
    projectsRequiringUpdates,
    matterportProcessing: 0,
    reportsPending: 0,
    storageUsedBytes: storage.totalBytes,
    storageLimitBytes: storage.quota.limitBytes,
    todaysUploads: (toursTodayRes.count ?? 0) + (reportsTodayRes.count ?? 0),
  };
}
