"use client";

import { useMemo } from "react";
import { Camera, FileText, HardDrive, ImageIcon, AlertTriangle } from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import type { AdminStorageStats } from "@/lib/actions/data";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  documents: FileText,
  reports: FileText,
  photos: ImageIcon,
  issue_images: AlertTriangle,
  matterport: Camera,
} as const;

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

  const usagePercent = Math.min(
    100,
    Math.round((stats.totalBytes / stats.limitBytes) * 100)
  );

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
              of {formatBytes(stats.limitBytes)} allocated
              {client ? ` · ${client.company_name || client.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <HardDrive className="h-4 w-4" />
            {usagePercent}% used
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-brand-accent transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                    ? "tours linked"
                    : "items stored"}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    category.id === "documents" && "bg-blue-500",
                    category.id === "reports" && "bg-violet-500",
                    category.id === "photos" && "bg-amber-500",
                    category.id === "issue_images" && "bg-rose-500",
                    category.id === "matterport" && "bg-emerald-500"
                  )}
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
            Document and report file sizes aggregated per organization.
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
