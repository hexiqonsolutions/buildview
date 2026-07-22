import {
  getAdminDashboardStats,
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
  Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function formatGb(bytes: number) {
  return `${Math.round((bytes / 1_073_741_824) * 10) / 10} GB`;
}

export default async function AdminAnalyticsPage() {
  const [stats, opsStats, storageStats] = await Promise.all([
    getAdminDashboardStats(),
    getAdminOperationsStats(),
    getAdminStorageStats(),
  ]);

  return (
    <OpsWorkspacePage
      title="Analytics"
      description="Growth, usage, revenue, and operational insights across all BuildView projects."
      icon={FileText}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <AdminMetricCard label="Clients" value={stats.totalClients} icon={Users} />
        <AdminMetricCard label="Active Projects" value={stats.activeProjects} icon={FolderKanban} />
        <AdminMetricCard label="Matterport Tours" value={stats.totalTours} icon={Camera} />
        <AdminMetricCard label="Open Issues" value={stats.openIssues} icon={AlertTriangle} />
        <AdminMetricCard label="Documents" value={stats.totalDocuments} icon={FileText} />
        <AdminMetricCard label="Draft Invoices" value={opsStats.draftInvoices} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminBarChart
          title="Projects by Client"
          data={stats.projectsByClient.map((p) => ({ label: p.clientName, value: p.count }))}
        />
        <AdminBarChart
          title="Monthly Report Uploads"
          data={stats.monthlyUploads.map((m) => ({ label: m.month, value: m.count }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ops-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Revenue this month
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(stats.monthlyRevenue)}
          </p>
        </div>
        <div className="ops-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Storage used
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {formatGb(storageStats.totalBytes)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            of {formatGb(storageStats.limitBytes)} allocated
          </p>
        </div>
        <div className="ops-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Today&apos;s uploads
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
            {opsStats.todaysUploads}
          </p>
          <p className="mt-1 text-sm text-slate-500">Matterport + reports</p>
        </div>
      </div>

      <div className="ops-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Storage by category
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {storageStats.categories.map((category) => (
            <div key={category.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs text-slate-500">{category.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {category.bytes > 0
                  ? formatGb(category.bytes)
                  : category.fileCount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </OpsWorkspacePage>
  );
}
