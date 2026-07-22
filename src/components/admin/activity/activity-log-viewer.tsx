"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Filter, Loader2 } from "lucide-react";
import { getActivityLogs, type ActivityLogFilters } from "@/lib/actions/activity";
import type { ActivityLogWithUser, Project, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

const ENTITY_TYPES = [
  "all",
  "upload",
  "report",
  "document",
  "issue",
  "tour",
  "timeline",
  "impersonation",
  "invoice",
] as const;

function toCsv(rows: ActivityLogWithUser[]): string {
  const header = ["Date", "User", "Action", "Entity Type", "Project", "Entity ID"];
  const lines = rows.map((row) =>
    [
      row.created_at,
      row.user?.full_name ?? row.user?.email ?? "System",
      row.action,
      row.entity_type,
      row.project?.name ?? "",
      row.entity_id ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function ActivityLogViewer({
  initialLogs,
  projects,
  users,
  defaultProjectId,
}: {
  initialLogs: ActivityLogWithUser[];
  projects: Project[];
  users: User[];
  defaultProjectId?: string | null;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [filters, setFilters] = useState<ActivityLogFilters>({
    projectId: defaultProjectId ?? null,
    userId: null,
    entityType: null,
    query: null,
    fromDate: null,
    toDate: null,
  });
  const [pending, startTransition] = useTransition();

  const activeEntityType = filters.entityType ?? "all";

  function applyFilters() {
    startTransition(async () => {
      const next = await getActivityLogs({
        ...filters,
        entityType: activeEntityType === "all" ? null : activeEntityType,
        limit: 200,
      });
      setLogs(next);
    });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(logs)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buildview-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summary = useMemo(() => `${logs.length} event${logs.length === 1 ? "" : "s"}`, [logs.length]);

  return (
    <div className="space-y-4">
      <div className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search action text…"
            value={filters.query ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value || null }))}
          />
          <Select
            value={filters.projectId ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, projectId: v === "all" ? null : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.userId ?? "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, userId: v === "all" ? null : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activeEntityType}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                entityType: v === "all" ? null : v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All types" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.fromDate ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value || null }))}
          />
          <Input
            type="date"
            value={filters.toDate ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value || null }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={applyFilters} disabled={pending} className="ops-btn-primary">
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Filter className="mr-2 h-4 w-4" />
            )}
            Apply filters
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <span className="text-xs text-slate-500">{summary}</span>
        </div>
      </div>

      <div className="ops-card divide-y divide-slate-100 dark:divide-slate-800">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No activity matches these filters.</p>
        ) : (
          logs.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 px-5 py-4">
              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.action}</p>
                <p className="text-xs text-slate-500">
                  {activity.user?.full_name ?? "System"} · {activity.entity_type}
                  {activity.project?.name ? ` · ${activity.project.name}` : ""} ·{" "}
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
