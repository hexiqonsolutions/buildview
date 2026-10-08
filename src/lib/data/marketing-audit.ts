import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireStaffPermission } from "@/lib/auth/staff";

function monthBuckets(count = 6): Array<{ key: string; label: string; month: number; year: number }> {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (count - 1 - i));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString("en-US", { month: "short" }),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });
}

function countByMonth(
  rows: Array<{ created_at?: string | null; date?: string | null }>,
  buckets: ReturnType<typeof monthBuckets>,
  field: "created_at" | "date" = "created_at"
) {
  return buckets.map((b) => ({
    label: b.label,
    value: rows.filter((row) => {
      const raw = field === "date" ? row.date : row.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d.getMonth() === b.month && d.getFullYear() === b.year;
    }).length,
  }));
}

function groupCounts(values: Array<string | null | undefined>) {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const key = (value || "unknown").trim() || "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

type AdminMarketingAuditStats = {
  totalUsers: number;
  clientUsers: number;
  staffUsers: number;
  activeUsers30d: number;
  dormantClients60d: number;
  activeClients30d: number;
  newClientsThisMonth: number;
  newUsersThisMonth: number;
  overdueInvoices: number;
  overdueAmount: number;
  outstandingAmount: number;
  lifetimeBilled: number;
  lifetimePaid: number;
  collectionRate: number;
  avgProjectsPerClient: number;
  avgIssueResolutionDays: number | null;
  projectsNeedingScans: number;
  commentsOpen: number;
  commentsResolved: number;
  savedComparisons: number;
  notificationsSent: number;
  notificationsUnread: number;
  notificationReadRate: number;
  clientsWithContent30d: number;
  clientsBySubscription: Array<{ label: string; value: number }>;
  clientsByDashboardType: Array<{ label: string; value: number }>;
  usersByRole: Array<{ label: string; value: number }>;
  activityByEntity: Array<{ label: string; value: number }>;
  issuesByStatus: Array<{ label: string; value: number }>;
  activationFunnel: Array<{ label: string; value: number }>;
  monthlyNewClients: Array<{ label: string; value: number }>;
  monthlyNewUsers: Array<{ label: string; value: number }>;
  monthlyActivity: Array<{ label: string; value: number }>;
  monthlyTours: Array<{ label: string; value: number }>;
  monthlyDocuments: Array<{ label: string; value: number }>;
  monthlyPhotos: Array<{ label: string; value: number }>;
  monthlyRevenue: Array<{ label: string; value: number }>;
  monthlyBilled: Array<{ label: string; value: number }>;
  revenueByClient: Array<{ label: string; value: number }>;
  engagementLeaderboard: Array<{
    clientId: string;
    clientName: string;
    projects: number;
    users: number;
    lastSignInAt: string | null;
    contentUpdatedAt: string | null;
    score: number;
  }>;
  dormantClientList: Array<{
    clientId: string;
    clientName: string;
    lastSignInAt: string | null;
    daysSinceLogin: number | null;
  }>;
  recentImpersonations: Array<{
    id: string;
    action: string;
    created_at: string;
    userName: string;
  }>;
  topActors: Array<{ label: string; value: number }>;
};

/** Marketing + audit analytics for Control Center strategy and reviews. */
export async function getAdminMarketingAuditStats(): Promise<AdminMarketingAuditStats> {
  await requireStaffPermission("read", "analytics");
  const supabase = await createClient();
  const buckets = monthBuckets(6);
  const now = new Date();
  const dayMs = 86_400_000;
  const d30 = new Date(now.getTime() - 30 * dayMs);
  const d60 = new Date(now.getTime() - 60 * dayMs);

  const [
    clientsRes,
    usersRes,
    projectsRes,
    invoicesRes,
    activityRes,
    toursRes,
    documentsRes,
    photosRes,
    issuesRes,
    commentsRes,
    comparisonsRes,
    notificationsRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company_name, subscription_status, dashboard_type, created_at, is_active")
      .is("deleted_at", null),
    supabase
      .from("users")
      .select("id, role, client_id, created_at, is_active, full_name, email")
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id, client_id, client_name, status, created_at")
      .is("deleted_at", null),
    supabase
      .from("invoices")
      .select("id, client_id, amount, status, due_date, paid_date, issued_date, created_at")
      .is("deleted_at", null),
    supabase
      .from("activity_logs")
      .select("id, user_id, action, entity_type, created_at, user:users(full_name, email, role)")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("project_tours")
      .select("id, project_id, created_at, capture_date")
      .is("deleted_at", null),
    supabase
      .from("documents")
      .select("id, project_id, created_at")
      .is("deleted_at", null),
    supabase
      .from("timeline_photos")
      .select("id, created_at, timeline_event:timeline_events!inner(project_id)")
      .is("deleted_at", null),
    supabase
      .from("issues")
      .select("id, created_at, resolved_at, status")
      .is("deleted_at", null),
    supabase
      .from("project_comments")
      .select("id, status, created_at")
      .is("deleted_at", null),
    supabase.from("saved_comparisons").select("id, created_at").is("deleted_at", null),
    supabase.from("notifications").select("id, is_read, type, created_at, read_at"),
  ]);

  const clients = clientsRes.data ?? [];
  const users = usersRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const activity = activityRes.data ?? [];
  const tours = toursRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const photos = photosRes.data ?? [];
  const issues = issuesRes.data ?? [];
  const comments = commentsRes.data ?? [];
  const comparisons = comparisonsRes.data ?? [];
  const notifications = notificationsRes.data ?? [];

  const lastSignInById = new Map<string, string | null>();
  try {
    const admin = createServiceRoleClient();
    const authListed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authListed.data.users.forEach((u) => {
      lastSignInById.set(u.id, u.last_sign_in_at ?? null);
    });
  } catch (err) {
    console.warn("[getAdminMarketingAuditStats] auth listUsers failed:", err);
  }

  const clientRoles = new Set(
    [
      "client",
      "client_admin",
      "site_supervisor",
      "site_engineer",
      "client_user",
      "read_only_client",
      "consultant",
    ] as const
  );
  const staffRoles = new Set(["super_admin", "admin", "operations_manager"] as const);

  const clientUsers = users.filter((u) => clientRoles.has(u.role as never));
  const staffUsers = users.filter((u) => staffRoles.has(u.role as never));

  const activeUserIds30d = new Set(
    users
      .filter((u) => {
        const last = lastSignInById.get(u.id);
        return last && new Date(last) >= d30;
      })
      .map((u) => u.id)
  );

  const clientLastSignIn = new Map<string, string | null>();
  clientUsers.forEach((u) => {
    if (!u.client_id) return;
    const last = lastSignInById.get(u.id) ?? null;
    const prev = clientLastSignIn.get(u.client_id) ?? null;
    if (!prev || (last && new Date(last) > new Date(prev))) {
      clientLastSignIn.set(u.client_id, last);
    }
  });

  const activeClients30d = clients.filter((c) => {
    const last = clientLastSignIn.get(c.id);
    return last && new Date(last) >= d30;
  }).length;

  const allDormantClients = clients
    .map((c) => {
      const last = clientLastSignIn.get(c.id) ?? null;
      const daysSinceLogin = last
        ? Math.floor((now.getTime() - new Date(last).getTime()) / dayMs)
        : null;
      return {
        clientId: c.id,
        clientName: c.company_name || c.name,
        lastSignInAt: last,
        daysSinceLogin,
      };
    })
    .filter((c) => c.daysSinceLogin === null || c.daysSinceLogin >= 60)
    .sort((a, b) => (b.daysSinceLogin ?? 9999) - (a.daysSinceLogin ?? 9999));
  const dormantClientList = allDormantClients.slice(0, 8);

  const projectClientMap = new Map(projects.map((p) => [p.id, p.client_id]));
  const contentUpdatedByClient = new Map<string, string>();
  const bumpContent = (projectId: string | null | undefined, iso: string | null | undefined) => {
    if (!projectId || !iso) return;
    const clientId = projectClientMap.get(projectId);
    if (!clientId) return;
    const prev = contentUpdatedByClient.get(clientId);
    if (!prev || new Date(iso) > new Date(prev)) {
      contentUpdatedByClient.set(clientId, iso);
    }
  };
  tours.forEach((t) => bumpContent(t.project_id, t.created_at));
  documents.forEach((d) => bumpContent(d.project_id, d.created_at));
  photos.forEach((p) => {
    const event = p.timeline_event as { project_id?: string } | null;
    bumpContent(event?.project_id, p.created_at);
  });

  const projectsByClient = new Map<string, number>();
  projects.forEach((p) => {
    if (!p.client_id) return;
    projectsByClient.set(p.client_id, (projectsByClient.get(p.client_id) ?? 0) + 1);
  });
  const usersByClient = new Map<string, number>();
  clientUsers.forEach((u) => {
    if (!u.client_id) return;
    usersByClient.set(u.client_id, (usersByClient.get(u.client_id) ?? 0) + 1);
  });

  const engagementLeaderboard = clients
    .map((c) => {
      const lastSignInAt = clientLastSignIn.get(c.id) ?? null;
      const contentUpdatedAt = contentUpdatedByClient.get(c.id) ?? null;
      const projectCount = projectsByClient.get(c.id) ?? 0;
      const userCount = usersByClient.get(c.id) ?? 0;
      const recentLoginBoost =
        lastSignInAt && new Date(lastSignInAt) >= d30
          ? 40
          : lastSignInAt && new Date(lastSignInAt) >= d60
            ? 20
            : 0;
      const contentBoost =
        contentUpdatedAt && new Date(contentUpdatedAt) >= d30
          ? 30
          : contentUpdatedAt && new Date(contentUpdatedAt) >= d60
            ? 15
            : 0;
      return {
        clientId: c.id,
        clientName: c.company_name || c.name,
        projects: projectCount,
        users: userCount,
        lastSignInAt,
        contentUpdatedAt,
        score: projectCount * 10 + userCount * 5 + recentLoginBoost + contentBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status === "overdue" ||
      (inv.due_date &&
        ["sent", "draft"].includes(inv.status) &&
        new Date(inv.due_date) < now)
  );
  const outstandingAmount = invoices
    .filter((inv) => ["sent", "overdue", "draft"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const lifetimeBilled = invoices
    .filter((inv) => inv.status !== "cancelled" && inv.status !== "draft")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const lifetimePaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const resolvedWithDates = issues.filter((i) => i.resolved_at && i.created_at);
  const avgIssueResolutionDays =
    resolvedWithDates.length === 0
      ? null
      : Math.round(
          (resolvedWithDates.reduce((sum, i) => {
            return (
              sum +
              (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()) / dayMs
            );
          }, 0) /
            resolvedWithDates.length) *
            10
        ) / 10;

  const latestTourByProject = new Map<string, string>();
  tours.forEach((t) => {
    const stamp = t.capture_date ?? t.created_at;
    const prev = latestTourByProject.get(t.project_id);
    if (!prev || new Date(stamp) > new Date(prev)) {
      latestTourByProject.set(t.project_id, stamp);
    }
  });
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * dayMs);
  const projectsNeedingScans = projects.filter((p) => {
    if (p.status !== "planning" && p.status !== "in_progress") return false;
    const last = latestTourByProject.get(p.id);
    if (!last) return true;
    return new Date(last) < fortyFiveDaysAgo;
  }).length;

  const revenueByClientMap = new Map<string, number>();
  invoices
    .filter((inv) => inv.status === "paid")
    .forEach((inv) => {
      revenueByClientMap.set(
        inv.client_id,
        (revenueByClientMap.get(inv.client_id) ?? 0) + Number(inv.amount)
      );
    });
  const clientNameById = new Map(
    clients.map((c) => [c.id, c.company_name || c.name] as const)
  );
  const revenueByClient = Array.from(revenueByClientMap.entries())
    .map(([clientId, value]) => ({
      label: clientNameById.get(clientId) ?? "Client",
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const actorCounts = new Map<string, number>();
  activity.forEach((row) => {
    const user = row.user as { full_name?: string | null; email?: string | null } | null;
    const label = user?.full_name?.trim() || user?.email || "System";
    actorCounts.set(label, (actorCounts.get(label) ?? 0) + 1);
  });

  const recentImpersonations = activity
    .filter((row) => row.entity_type === "impersonation")
    .slice(0, 6)
    .map((row) => {
      const user = row.user as { full_name?: string | null; email?: string | null } | null;
      return {
        id: row.id,
        action: row.action,
        created_at: row.created_at,
        userName: user?.full_name?.trim() || user?.email || "Staff",
      };
    });

  const unread = notifications.filter((n) => !n.is_read).length;

  const clientsWithContent30d = clients.filter((c) => {
    const updated = contentUpdatedByClient.get(c.id);
    return updated && new Date(updated) >= d30;
  }).length;

  const monthlyRevenue = buckets.map((b) => ({
    label: b.label,
    value: Math.round(
      invoices
        .filter((inv) => {
          if (inv.status !== "paid") return false;
          const raw = inv.paid_date ?? inv.created_at;
          if (!raw) return false;
          const d = new Date(raw);
          return d.getMonth() === b.month && d.getFullYear() === b.year;
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0)
    ),
  }));

  const monthlyBilled = buckets.map((b) => ({
    label: b.label,
    value: Math.round(
      invoices
        .filter((inv) => {
          if (inv.status === "cancelled" || inv.status === "draft") return false;
          const raw = inv.issued_date ?? inv.created_at;
          if (!raw) return false;
          const d = new Date(raw);
          return d.getMonth() === b.month && d.getFullYear() === b.year;
        })
        .reduce((sum, inv) => sum + Number(inv.amount), 0)
    ),
  }));

  return {
    totalUsers: users.length,
    clientUsers: clientUsers.length,
    staffUsers: staffUsers.length,
    activeUsers30d: activeUserIds30d.size,
    dormantClients60d: allDormantClients.length,
    activeClients30d,
    newClientsThisMonth: clients.filter((c) => {
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    newUsersThisMonth: users.filter((u) => {
      const d = new Date(u.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    overdueInvoices: overdueInvoices.length,
    overdueAmount: overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
    outstandingAmount,
    lifetimeBilled,
    lifetimePaid,
    collectionRate:
      lifetimeBilled <= 0 ? 0 : Math.round((lifetimePaid / lifetimeBilled) * 100),
    avgProjectsPerClient:
      clients.length === 0
        ? 0
        : Math.round((projects.length / clients.length) * 10) / 10,
    avgIssueResolutionDays,
    projectsNeedingScans,
    commentsOpen: comments.filter((c) => c.status === "open").length,
    commentsResolved: comments.filter((c) => c.status === "resolved").length,
    savedComparisons: comparisons.length,
    notificationsSent: notifications.length,
    notificationsUnread: unread,
    notificationReadRate:
      notifications.length === 0
        ? 0
        : Math.round(((notifications.length - unread) / notifications.length) * 100),
    clientsWithContent30d,
    clientsBySubscription: groupCounts(clients.map((c) => c.subscription_status)),
    clientsByDashboardType: groupCounts(clients.map((c) => c.dashboard_type ?? "construction")),
    usersByRole: groupCounts(users.map((u) => u.role)),
    activityByEntity: groupCounts(activity.map((a) => a.entity_type)),
    issuesByStatus: groupCounts(issues.map((i) => i.status)),
    activationFunnel: [
      { label: "Clients", value: clients.length },
      { label: "Client users", value: clientUsers.length },
      { label: "Active (30d login)", value: activeClients30d },
      { label: "Fresh content (30d)", value: clientsWithContent30d },
    ],
    monthlyNewClients: countByMonth(clients, buckets),
    monthlyNewUsers: countByMonth(users, buckets),
    monthlyActivity: countByMonth(activity, buckets),
    monthlyTours: countByMonth(tours, buckets),
    monthlyDocuments: countByMonth(documents, buckets),
    monthlyPhotos: countByMonth(photos, buckets),
    monthlyRevenue,
    monthlyBilled,
    revenueByClient,
    engagementLeaderboard,
    dormantClientList,
    recentImpersonations,
    topActors: Array.from(actorCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  };
}
