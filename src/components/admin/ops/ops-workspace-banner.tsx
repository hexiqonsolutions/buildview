"use client";

import Link from "next/link";
import { Building2, FolderKanban } from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";

export function OpsWorkspaceBanner() {
  const { hydrated, client, project, scope } = useAdminWorkspace();

  if (!hydrated) {
    return <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (!client) {
    return (
      <div className="ops-workspace-banner ops-workspace-banner-empty">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Select a <strong>Client</strong> in the header to begin managing operations.
        </p>
        <Link href="/admin/clients" className="text-sm font-semibold text-slate-900 underline dark:text-white">
          Open Client Manager
        </Link>
      </div>
    );
  }

  return (
    <div className="ops-workspace-banner">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800">
          {client.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {client.company_name || client.name}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
            <FolderKanban className="h-3 w-3 shrink-0" />
            {project?.name ?? "All projects"}
            {scope.building !== "all" && ` · ${scope.building}`}
            {scope.floor !== "all" && ` · ${scope.floor}`}
          </p>
        </div>
      </div>
      <Link
        href={`/admin/clients/${client.id}`}
        className="shrink-0 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        Open workspace →
      </Link>
    </div>
  );
}
