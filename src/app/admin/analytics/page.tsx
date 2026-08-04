import Link from "next/link";
import {
  getAdminDashboardStats,
  getAdminMarketingAuditStats,
  getAdminOperationsStats,
  getAdminStorageStats,
} from "@/lib/actions/data";
import { AdminBarChart } from "@/components/admin/admin-charts";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import {
  Users,
  FolderKanban,
  Camera,
  AlertTriangle,
  FileText,
  HardDrive,
  ReceiptIndianRupee,
  TrendingUp,
  UserCheck,
  UserX,
  Activity,
  Columns2,
  Clock,
  Building2,
  Shield,
} from "lucide-react";
import { formatCurrency, formatDate, formatStatus } from "@/lib/utils";

function formatGb(bytes: number) {
  return `${Math.round((bytes / 1_073_741_824) * 10) / 10} GB`;
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="ops-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const [stats, opsStats, storageStats, marketing] = await Promise.all([
    getAdminDashboardStats(),
    getAdminOperationsStats(),
    getAdminStorageStats(),
    getAdminMarketingAuditStats(),
  ]);

  return (
    <OpsWorkspacePage
      title="Analytics"
      description="Growth, engagement, billing, delivery, and audit insights for marketing strategy and operational reviews."
      icon={FileText}
      showBanner={false}
    >
      {/* Platform snapshot */}
      <section className="space-y-4">
        <SectionHeading
          title="Platform snapshot"
          description="Core portfolio health across clients, projects, and content."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
          <AdminMetricCard label="Clients" value={stats.totalClients} icon={Users} />
          <AdminMetricCard
            label="Active Projects"
            value={stats.activeProjects}
            icon={FolderKanban}
          />
          <AdminMetricCard label="Virtual Tours" value={stats.totalTours} icon={Camera} />
          <AdminMetricCard label="Open Issues" value={stats.openIssues} icon={AlertTriangle} />
          <AdminMetricCard label="Documents" value={stats.totalDocuments} icon={FileText} />
          <AdminMetricCard
            label="Invoices"
            value={stats.totalInvoices}
            icon={ReceiptIndianRupee}
            trend={stats.draftInvoices > 0 ? `${stats.draftInvoices} draft` : undefined}
            trendTone="neutral"
          />
          <AdminMetricCard
            label="Client users"
            value={marketing.clientUsers}
            icon={UserCheck}
            trend={`${marketing.staffUsers} staff`}
            trendTone="neutral"
          />
          <AdminMetricCard
            label="Total users"
            value={marketing.totalUsers}
            icon={Users}
            trend={`${stats.totalReports} reports`}
            trendTone="neutral"
          />
        </div>
      </section>

      {/* Growth & marketing */}
      <section className="space-y-4">
        <SectionHeading
          title="Growth & marketing"
          description="Acquisition, portal mix, and user expansion signals for go-to-market planning."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InsightCard
            label="New clients this month"
            value={marketing.newClientsThisMonth}
            hint="Fresh logos added"
          />
          <InsightCard
            label="New users this month"
            value={marketing.newUsersThisMonth}
            hint="Portal + staff accounts"
          />
          <InsightCard
            label="Avg projects / client"
            value={marketing.avgProjectsPerClient}
            hint="Account depth signal"
          />
          <InsightCard
            label="Fresh content (30d)"
            value={marketing.clientsWithContent30d}
            hint="Clients with new tours/docs/photos"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AdminBarChart
            title="Activation funnel"
            data={marketing.activationFunnel}
            scaleToMax
            emptyMessage="No clients yet"
          />
          <AdminBarChart
            title="New clients (6 mo)"
            data={marketing.monthlyNewClients}
            scaleToMax
            emptyMessage="No client growth yet"
          />
          <AdminBarChart
            title="New users (6 mo)"
            data={marketing.monthlyNewUsers}
            scaleToMax
            emptyMessage="No user growth yet"
          />
          <AdminBarChart
            title="Clients by subscription"
            data={marketing.clientsBySubscription.map((row) => ({
              label: formatStatus(row.label),
              value: row.value,
            }))}
            emptyMessage="No subscription data"
          />
          <AdminBarChart
            title="Portal type mix"
            data={marketing.clientsByDashboardType.map((row) => ({
              label: formatStatus(row.label),
              value: row.value,
            }))}
            emptyMessage="No portal types"
          />
          <AdminBarChart
            title="Users by role"
            data={marketing.usersByRole.map((row) => ({
              label: formatStatus(row.label),
              value: row.value,
            }))}
            emptyMessage="No users"
          />
        </div>
      </section>

      {/* Engagement */}
      <section className="space-y-4">
        <SectionHeading
          title="Client engagement"
          description="Who is active, who is dormant, and which accounts deserve nurture or upsell."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminMetricCard
            label="Active clients (30d)"
            value={marketing.activeClients30d}
            icon={UserCheck}
            trend={`${marketing.activeUsers30d} users signed in`}
            trendTone="up"
          />
          <AdminMetricCard
            label="Dormant clients (60d+)"
            value={marketing.dormantClients60d}
            icon={UserX}
            trend="Re-engagement candidates"
            trendTone="down"
          />
          <AdminMetricCard
            label="Projects needing scans"
            value={marketing.projectsNeedingScans}
            icon={Camera}
            trend="No tour in 45+ days"
            trendTone="neutral"
          />
          <AdminMetricCard
            label="Saved comparisons"
            value={marketing.savedComparisons}
            icon={Columns2}
            trend="Compare Tours usage"
            trendTone="neutral"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="ops-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Engagement leaderboard
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Score from projects, users, recent logins, and fresh content.
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {marketing.engagementLeaderboard.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No clients yet.</p>
              ) : (
                marketing.engagementLeaderboard.map((row, index) => (
                  <div
                    key={row.clientId}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {index + 1}. {row.clientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.projects} projects · {row.users} users · last login{" "}
                        {row.lastSignInAt ? formatDate(row.lastSignInAt) : "never"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {row.score}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="ops-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Dormant clients to nurture
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                No portal sign-in for 60+ days — outreach / training opportunities.
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {marketing.dormantClientList.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  All clients signed in recently.
                </p>
              ) : (
                marketing.dormantClientList.map((row) => (
                  <div
                    key={row.clientId}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {row.clientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.lastSignInAt
                          ? `Last login ${formatDate(row.lastSignInAt)}`
                          : "Never signed in"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {row.daysSinceLogin == null ? "No login" : `${row.daysSinceLogin}d`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InsightCard
            label="Open comments"
            value={marketing.commentsOpen}
            hint="Client feedback threads"
          />
          <InsightCard
            label="Resolved comments"
            value={marketing.commentsResolved}
            hint="Closed discussions"
          />
          <InsightCard
            label="Notifications sent"
            value={marketing.notificationsSent}
            hint={`${marketing.notificationsUnread} unread`}
          />
          <InsightCard
            label="Notification read rate"
            value={`${marketing.notificationReadRate}%`}
            hint="Portal attention signal"
          />
        </div>
      </section>

      {/* Billing */}
      <section className="space-y-4">
        <SectionHeading
          title="Billing & revenue"
          description="Cash collected, billed pipeline, and client revenue concentration."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InsightCard
            label="Revenue this month"
            value={formatCurrency(stats.monthlyRevenue)}
            hint="Paid invoices"
          />
          <InsightCard
            label="Billed this month"
            value={formatCurrency(stats.billedThisMonth)}
            hint="Sent / overdue / paid"
          />
          <InsightCard
            label="Outstanding"
            value={formatCurrency(marketing.outstandingAmount)}
            hint="Draft + sent + overdue"
          />
          <InsightCard
            label="Collection rate"
            value={`${marketing.collectionRate}%`}
            hint="Lifetime paid ÷ billed"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AdminBarChart
            title="Paid revenue (6 mo)"
            data={marketing.monthlyRevenue}
            scaleToMax
            valueFormat="currency"
            emptyMessage="No paid revenue yet"
          />
          <AdminBarChart
            title="Billed amount (6 mo)"
            data={marketing.monthlyBilled}
            scaleToMax
            valueFormat="currency"
            emptyMessage="No billed invoices yet"
          />
          <AdminBarChart
            title="Invoices by status"
            data={stats.invoicesByStatus
              .map((row) => ({
                label: formatStatus(row.status),
                value: row.count,
              }))
              .sort((a, b) => b.value - a.value)}
            emptyMessage="No invoices yet"
          />
          <AdminBarChart
            title="Paid revenue by client"
            data={marketing.revenueByClient}
            valueFormat="currency"
            emptyMessage="No paid invoices yet"
          />
          <AdminBarChart
            title="Projects by status"
            data={stats.projectsByStatus.map((row) => ({
              label: formatStatus(row.status),
              value: row.count,
            }))}
            emptyMessage="No projects"
          />
          <AdminBarChart
            title="Issues by status"
            data={marketing.issuesByStatus.map((row) => ({
              label: formatStatus(row.label),
              value: row.value,
            }))}
            emptyMessage="No issues"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <InsightCard
            label="Overdue"
            value={formatCurrency(marketing.overdueAmount)}
            hint={`${marketing.overdueInvoices} invoices`}
          />
          <InsightCard
            label="Lifetime billed"
            value={formatCurrency(marketing.lifetimeBilled)}
          />
          <InsightCard label="Lifetime paid" value={formatCurrency(marketing.lifetimePaid)} />
          <InsightCard
            label="Avg issue close (days)"
            value={marketing.avgIssueResolutionDays ?? "—"}
            hint="Resolved issues only"
          />
        </div>
      </section>

      {/* Delivery velocity */}
      <section className="space-y-4">
        <SectionHeading
          title="Delivery & content velocity"
          description="Upload cadence and content mix — proof of ongoing client value."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminMetricCard
            label="Today's uploads"
            value={opsStats.todaysUploads}
            icon={TrendingUp}
            trend="Virtual tours + reports"
            trendTone="neutral"
          />
          <AdminMetricCard
            label="Projects need updates"
            value={opsStats.projectsRequiringUpdates}
            icon={FolderKanban}
            trend="Ops follow-up queue"
            trendTone="down"
          />
          <AdminMetricCard
            label="Storage used"
            value={`${opsStats.storageUsedGb} GB`}
            icon={HardDrive}
            trend={`of ${opsStats.storageLimitGb} GB`}
            trendTone="neutral"
          />
          <AdminMetricCard
            label="Issue mix"
            value={stats.openIssues}
            icon={AlertTriangle}
            trend="Open / in progress"
            trendTone="neutral"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AdminBarChart title="Projects by client" data={stats.projectsByClient.map((p) => ({ label: p.clientName, value: p.count }))} />
          <AdminBarChart
            title="Monthly report uploads"
            data={stats.monthlyUploads.map((m) => ({ label: m.month, value: m.count }))}
            scaleToMax
          />
          <AdminBarChart title="Monthly virtual tours" data={marketing.monthlyTours} scaleToMax />
          <AdminBarChart title="Monthly documents" data={marketing.monthlyDocuments} scaleToMax />
          <AdminBarChart title="Monthly site photos" data={marketing.monthlyPhotos} scaleToMax />
          <AdminBarChart
            title="Issues by priority"
            data={stats.issueDistribution.map((row) => ({
              label: formatStatus(row.priority),
              value: row.count,
            }))}
            emptyMessage="No issues"
          />
        </div>
      </section>

      {/* Audit */}
      <section className="space-y-4">
        <SectionHeading
          title="Audit & operations trail"
          description="Who did what — useful for compliance reviews and internal marketing ops audits."
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AdminBarChart
            title="Activity by entity type"
            data={marketing.activityByEntity.map((row) => ({
              label: formatStatus(row.label),
              value: row.value,
            }))}
            emptyMessage="No activity logged"
          />
          <AdminBarChart title="Platform activity (6 mo)" data={marketing.monthlyActivity} />
          <AdminBarChart title="Top actors" data={marketing.topActors} emptyMessage="No actors yet" />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="ops-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent activity
                </h3>
              </div>
              <Link
                href="/admin/activity"
                className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recentActivity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No recent activity.</p>
              ) : (
                stats.recentActivity.slice(0, 8).map((activity) => {
                  const user = activity.user as
                    | { full_name?: string | null; email?: string | null }
                    | null
                    | undefined;
                  return (
                    <div key={activity.id} className="px-5 py-3">
                      <p className="text-sm text-slate-900 dark:text-white">{activity.action}</p>
                      <p className="text-xs text-slate-500">
                        {user?.full_name ?? user?.email ?? "System"} ·{" "}
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="ops-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Impersonation audit
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Staff logins-as-client — review for support quality and access control.
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {marketing.recentImpersonations.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No impersonation events logged.
                </p>
              ) : (
                marketing.recentImpersonations.map((row) => (
                  <div key={row.id} className="px-5 py-3">
                    <p className="text-sm text-slate-900 dark:text-white">{row.action}</p>
                    <p className="text-xs text-slate-500">
                      {row.userName} · {formatDate(row.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="space-y-4">
        <SectionHeading
          title="Storage footprint"
          description="Content volume by category — useful for packaging and upsell conversations."
        />
        <div className="ops-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Storage by category
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {storageStats.categories.map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"
              >
                <p className="text-xs text-slate-500">{category.label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {category.bytes > 0 ? formatGb(category.bytes) : category.fileCount}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Total {formatGb(storageStats.totalBytes)} of {formatGb(storageStats.limitBytes)}{" "}
            allocated
          </p>
        </div>
      </section>

      {/* Strategy notes */}
      <section className="ops-card p-5">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-white">
              How to use this for marketing & audits
            </p>
            <ul className="list-disc space-y-1 pl-4 text-slate-500">
              <li>
                Prioritize outreach to dormant clients and projects that need fresh virtual tour
                scans.
              </li>
              <li>
                Use the activation funnel + engagement leaderboard to plan case studies, upsells,
                and construction vs portfolio messaging.
              </li>
              <li>
                Track billed vs paid trends and collection rate for revenue forecasting and chase
                campaigns.
              </li>
              <li>
                Review activity / impersonation logs before monthly operational audits.
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/admin/clients"
                className="cursor-pointer text-xs font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                Open Client Manager
              </Link>
              <Link
                href="/admin/invoices"
                className="cursor-pointer text-xs font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                Open Invoices
              </Link>
              <Link
                href="/admin/activity"
                className="cursor-pointer text-xs font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                Open Activity Logs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </OpsWorkspacePage>
  );
}
