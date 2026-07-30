"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  Camera,
  AlertTriangle,
  FileText,
  HardDrive,
  IndianRupee,
  Upload,
  Clock,
  ArrowRight,
  Zap,
  Building2,
  ReceiptIndianRupee,
} from "lucide-react";
import type { AdminOperationsStats } from "@/lib/actions/data";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

interface OperationsDashboardProps {
  stats: AdminOperationsStats;
  firstName?: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

function welcomeInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OperationsDashboard({
  stats,
  firstName = "there",
  fullName,
  email,
  avatarUrl,
}: OperationsDashboardProps) {
  const router = useRouter();
  const { hydrated, client, project, clients, clientProjects, setClientId } =
    useAdminWorkspace();

  function activateClient(clientId: string, openWorkspace = false) {
    setClientId(clientId);
    if (openWorkspace) {
      router.push(`/admin/clients/${clientId}`);
    }
  }

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

  const activeProjects = clientProjects.filter((p) => p.status !== "completed").length;

  return (
    <div className="dashboard-page">
      <div className="flex items-center gap-4 sm:gap-5">
        <Link
          href="/dashboard/profile"
          className="shrink-0 cursor-pointer self-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Open profile"
        >
          <Avatar className="h-20 w-20 ring-2 ring-white shadow-md dark:ring-slate-800 sm:h-24 sm:w-24">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={fullName || firstName}
              className="object-cover"
            />
            <AvatarFallback className="bg-slate-900 text-xl font-semibold text-white sm:text-2xl">
              {welcomeInitials(fullName || firstName, email)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="ops-page-eyebrow">Operations Control Center</p>
          <h1 className="truncate font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Welcome Back, {firstName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            {client
              ? `Working in ${client.company_name || client.name}${project ? ` · ${project.name}` : ""}. Open the full client workspace for users, invoices, and project detail.`
              : "BuildView platform overview across all clients. Select a client above to activate a workspace."}
          </p>
        </div>
      </div>

      {hydrated && !client && (
        <div className="ops-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="dashboard-section-title">Activate a client workspace</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose a client to filter Content pages and open their full workspace.
            </p>
          </div>
          {clients.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                No clients yet
              </p>
              <Button asChild size="sm" className="ops-btn-primary mt-4">
                <Link href="/admin/clients">Open Client Manager</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {clients.map((c) => {
                const projectCount = clientProjects.filter((p) => p.client_id === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => activateClient(c.id, true)}
                    className="group flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                      {c.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-200">
                          {(c.company_name || c.name).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {c.company_name || c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {projectCount} project{projectCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hydrated && client && (
        <div className="ops-card overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-5 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                {client.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={client.logo_url}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Active Workspace
                </p>
                <h2 className="mt-1 truncate font-display text-xl font-bold text-slate-900 dark:text-white">
                  {client.company_name || client.name}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {client.email}
                  {client.phone ? ` · ${client.phone}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={client.is_active ? "secondary" : "destructive"}>
                    {client.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{clientProjects.length} projects</Badge>
                  <Badge variant="outline">{activeProjects} in progress</Badge>
                  {project ? (
                    <Badge variant="outline" className="max-w-[12rem] truncate">
                      {project.name}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button asChild size="sm" className="ops-btn-primary h-9 cursor-pointer">
                <Link href={`/admin/clients/${client.id}`}>
                  Open full workspace
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 cursor-pointer"
                onClick={() => setClientId(null)}
              >
                Clear workspace
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-4">
            {[
              {
                label: "Projects",
                value: clientProjects.length,
                href: `/admin/clients/${client.id}`,
                icon: FolderKanban,
              },
              {
                label: "Invoices",
                value: "Billing",
                href: "/admin/invoices",
                icon: ReceiptIndianRupee,
              },
              {
                label: "Issues",
                value: "Track",
                href: "/admin/issues",
                icon: AlertTriangle,
              },
              {
                label: "Documents",
                value: "Files",
                href: "/admin/documents",
                icon: FileText,
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex cursor-pointer items-center gap-3 bg-white px-4 py-4 transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
              >
                <item.icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {clientProjects.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Projects
              </p>
              <div className="flex flex-wrap gap-2">
                {clientProjects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/projects/${p.id}`}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                  >
                    {p.name}
                    <span className="ml-1.5 capitalize text-slate-400">
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queueItems.map((item) => (
          <Link key={item.label} href={item.href} className="ops-queue-card group cursor-pointer">
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
          icon={IndianRupee}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="ops-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="dashboard-section-title">Today&apos;s Operations</h2>
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
          <Link
            href="/admin/activity"
            className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-900"
          >
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
