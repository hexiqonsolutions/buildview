"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Camera,
  FileText,
  Film,
  HardDrive,
  ImageIcon,
  Info,
  UserCircle,
} from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import type { AdminStorageCategoryId, AdminStorageStats } from "@/lib/data/storage";
import type { StorageQuota } from "@/lib/supabase/plan";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  documents: FileText,
  reports: FileText,
  photos: ImageIcon,
  issue_images: AlertTriangle,
  project_media: Film,
  project_covers: ImageIcon,
  avatars: UserCircle,
  matterport: Camera,
} as const satisfies Record<AdminStorageCategoryId, unknown>;

const CATEGORY_COLORS: Record<AdminStorageCategoryId, string> = {
  documents: "bg-blue-500",
  reports: "bg-violet-500",
  photos: "bg-amber-500",
  issue_images: "bg-rose-500",
  project_media: "bg-cyan-500",
  project_covers: "bg-orange-500",
  avatars: "bg-slate-400",
  matterport: "bg-emerald-500",
};

const PLAN_LABELS: Record<NonNullable<StorageQuota["plan"]>, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
  platform: "Platform",
};

function describeQuota(quota: StorageQuota): string {
  const plan = quota.plan ? `Supabase ${PLAN_LABELS[quota.plan]} plan` : null;
  if (quota.limitBytes === null) {
    return plan
      ? `${plan} · custom quota (set SUPABASE_STORAGE_QUOTA_GB)`
      : "Supabase plan not connected (set SUPABASE_ACCESS_TOKEN)";
  }
  const limit = `of ${formatBytes(quota.limitBytes)} included`;
  if (quota.source === "override") return `${limit} · set by SUPABASE_STORAGE_QUOTA_GB`;
  return plan ? `${limit} in ${plan}` : limit;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

interface StorageManagerProps {
  stats: AdminStorageStats;
}

export function StorageManager({ stats }: StorageManagerProps) {
  const { hydrated, scope, client } = useAdminWorkspace();
  const { quota } = stats;

  const rawPercent =
    quota.limitBytes !== null ? Math.round((stats.totalBytes / quota.limitBytes) * 100) : null;
  const usagePercent = rawPercent !== null ? Math.min(100, rawPercent) : null;
  const overQuota = rawPercent !== null && rawPercent > 100;

  const clientRows = useMemo(() => {
    if (scope.clientId) {
      return stats.clients.filter((c) => c.clientId === scope.clientId);
    }
    return stats.clients;
  }, [stats.clients, scope.clientId]);

  const scopedTotalBytes = clientRows.reduce((sum, c) => sum + c.bytes, 0);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-6">
      <div className="ops-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total storage
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white">
              {formatBytes(scope.clientId ? scopedTotalBytes : stats.totalBytes)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {describeQuota(quota)}
              {client ? ` · ${client.company_name || client.name}` : ""}
            </p>
          </div>
          {rawPercent !== null && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm",
                overQuota ? "font-medium text-rose-600" : "text-slate-500"
              )}
            >
              <HardDrive className="h-4 w-4" />
              {rawPercent}% used
            </div>
          )}
        </div>
        {usagePercent !== null && (
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overQuota ? "bg-rose-500" : usagePercent >= 80 ? "bg-amber-500" : "bg-brand-accent"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        )}
        {overQuota && (
          <p className="mt-3 text-xs text-rose-600">
            {quota.overageBilled
              ? "Over the included quota — Supabase bills the extra storage per GB."
              : "Over the Free plan quota — Supabase may restrict uploads until you upgrade or free up space."}
          </p>
        )}
        {stats.usageSource === "database" && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Showing documents and reports only. Apply migration 031 to measure every file in
            Supabase Storage.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id];
          const pct =
            stats.totalBytes > 0 && category.bytes > 0
              ? Math.max(4, Math.round((category.bytes / stats.totalBytes) * 100))
              : category.fileCount > 0
                ? 8
                : 0;

          return (
            <div key={category.id} className="ops-card p-5">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-medium text-slate-500">{category.label}</p>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
                {category.bytes > 0 ? formatBytes(category.bytes) : category.fileCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {category.bytes > 0
                  ? `${category.fileCount} files`
                  : category.id === "matterport"
                    ? "tours hosted on Matterport"
                    : "files stored"}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn("h-full rounded-full", CATEGORY_COLORS[category.id])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="ops-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Storage by client
          </h2>
          <p className="text-xs text-slate-500">
            {stats.usageSource === "storage"
              ? "All project files in Supabase Storage, grouped by organization."
              : "Document and report file sizes aggregated per organization."}
          </p>
        </div>
        {clientRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No storage data yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {clientRows.map((row) => {
              const rowPct =
                stats.totalBytes > 0
                  ? Math.max(2, Math.round((row.bytes / stats.totalBytes) * 100))
                  : 0;
              return (
                <div key={row.clientId} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {row.clientName}
                    </p>
                    <p className="text-xs text-slate-500">{row.fileCount} files</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formatBytes(row.bytes)}
                  </p>
                  <div className="hidden w-32 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-accent"
                        style={{ width: `${rowPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
