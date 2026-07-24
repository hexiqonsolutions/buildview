import Link from "next/link";
import {
  Users,
  FolderKanban,
  Camera,
  AlertTriangle,
  FileText,
  HardDrive,
  Receipt,
  DollarSign,
  Upload,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import type { AdminOperationsStats } from "@/lib/actions/data";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

interface OperationsDashboardProps {
  stats: AdminOperationsStats;
}

export function OperationsDashboard({ stats }: OperationsDashboardProps) {
  const queueItems = [
    {
      label: "Uploads waiting",
      value: stats.pendingUploads,
      href: "/admin/upload",
      tone: stats.pendingUploads > 0 ? "text-amber-600" : "text-slate-500",
    },
    {
      label: "Projects need updates",
      value: stats.projectsRequiringUpdates,
      href: "/admin/projects",
      tone: stats.projectsRequiringUpdates > 0 ? "text-rose-600" : "text-slate-500",
    },
    {
      label: "Matterport processing",
      value: stats.matterportProcessing,
      href: "/admin/tours",
      tone: "text-slate-500",
    },
    {
      label: "Draft invoices",
      value: stats.draftInvoices,
      href: "/admin/invoices",
      tone: stats.draftInvoices > 0 ? "text-amber-600" : "text-slate-500",
    },
  ];

  return (
    <div className="dashboard-page">
      <div>
        <p className="ops-page-eyebrow">Operations Control Center</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Mission Control
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Manage BuildView operations across clients and projects. Select a client workspace
          above — everything updates automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queueItems.map((item) => (
          <Link key={item.label} href={item.href} className="ops-queue-card group">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className={`mt-2 font-display text-3xl font-bold ${item.tone}`}>{item.value}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        <AdminMetricCard label="Clients" value={stats.totalClients} icon={Users} />
        <AdminMetricCard label="Projects" value={stats.activeProjects} icon={FolderKanban} />
        <AdminMetricCard label="Matterport Tours" value={stats.totalTours} icon={Camera} />
        <AdminMetricCard label="Pending Uploads" value={stats.pendingUploads} icon={Clock} />
        <AdminMetricCard
          label="Storage Used"
          value={`${stats.storageUsedGb} GB`}
          icon={HardDrive}
          trend={`of ${stats.storageLimitGb} GB`}
          trendTone="neutral"
        />
        <AdminMetricCard label="Reports Uploaded" value={stats.totalReports} icon={FileText} />
        <AdminMetricCard label="Open Issues" value={stats.openIssues} icon={AlertTriangle} />
        <AdminMetricCard
          label="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="ops-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="dashboard-section-title">
                Today&apos;s Operations
              </h2>
              <p className="text-xs text-slate-500">{stats.todaysUploads} uploads today</p>
            </div>
            <Zap className="h-5 w-5 text-brand-accent" />
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <TodayStat label="Uploads today" value={stats.todaysUploads} />
            <TodayStat label="Open issues" value={stats.openIssues} />
            <TodayStat
              label="Storage"
              value={`${stats.storageUsedGb} / ${stats.storageLimitGb} GB`}
            />
          </div>
          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monthly uploads
            </h3>
            <div className="flex h-24 items-end gap-2">
              {stats.monthlyUploads.map((m) => {
                const max = Math.max(...stats.monthlyUploads.map((x) => x.count), 1);
                return (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full max-w-8 rounded-t-md bg-slate-900 dark:bg-white"
                      style={{
                        height: `${Math.max((m.count / max) * 72, m.count > 0 ? 8 : 4)}px`,
                        opacity: m.count > 0 ? 1 : 0.15,
                      }}
                    />
                    <span className="text-[10px] text-slate-500">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="ops-card p-5">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Recent Uploads
            </h3>
            <div className="mt-4 space-y-3">
              {stats.recentUploads.length === 0 ? (
                <p className="text-sm text-slate-500">No uploads yet.</p>
              ) : (
                stats.recentUploads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
                  >
                    <Upload className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent-dark" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.type} · {item.projectName} · {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ops-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Activity Log
          </h3>
          <Link href="/admin/activity" className="text-xs font-medium text-slate-500 hover:text-slate-900">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"
              >
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
                <div>
                  <p className="text-sm text-slate-900 dark:text-white">{activity.action}</p>
                  <p className="text-xs text-slate-500">
                    {activity.user?.full_name ?? "System"} · {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TodayStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
