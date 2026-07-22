"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, GripVertical } from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { matchesSpatialScope } from "@/lib/admin/scope";
import { IssueDetailDrawer } from "@/components/admin/issues/issue-detail-drawer";
import { CreateIssueForm } from "@/components/admin/create-issue-form";
import { updateIssueStatus } from "@/lib/actions/issues";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type IssueWithRelations,
  type Project,
  type User,
} from "@/lib/types";
import { cn, formatDate, getStatusColor } from "@/lib/utils";

const COLUMNS: IssueStatus[] = ["open", "in_progress", "resolved", "closed"];

const COLUMN_STYLES: Record<IssueStatus, string> = {
  open: "border-rose-200/80 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20",
  in_progress: "border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
  resolved: "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
  closed: "border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30",
};

type IssueRow = IssueWithRelations & { project?: { name: string; id?: string } | null };

interface IssueKanbanProps {
  issues: IssueRow[];
  projects: Project[];
  users: User[];
}

export function IssueKanban({ issues, projects, users }: IssueKanbanProps) {
  const { hydrated, scope, clientProjects, project } = useAdminWorkspace();
  const [selectedIssue, setSelectedIssue] = useState<IssueRow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<IssueStatus | null>(null);
  const [, startTransition] = useTransition();

  const scopedProjectIds = useMemo(() => {
    if (scope.projectId) return new Set([scope.projectId]);
    if (scope.clientId) return new Set(clientProjects.map((p) => p.id));
    return new Set(projects.map((p) => p.id));
  }, [scope, clientProjects, projects]);

  const filtered = useMemo(() => {
    return issues.filter((issue) =>
      matchesSpatialScope(issue, scope, scopedProjectIds)
    );
  }, [issues, scope, scopedProjectIds]);

  const byStatus = useMemo(() => {
    const map: Record<IssueStatus, IssueRow[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };
    filtered.forEach((issue) => {
      map[issue.status]?.push(issue);
    });
    return map;
  }, [filtered]);

  function handleDrop(status: IssueStatus, issueId: string) {
    const issue = filtered.find((i) => i.id === issueId);
    if (!issue || issue.status === status) return;

    startTransition(async () => {
      try {
        await updateIssueStatus(issueId, status);
      } catch {
        // Server revalidation will restore state on next navigation
      }
    });
  }

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} issue{filtered.length === 1 ? "" : "s"}
          {project ? ` · ${project.name}` : scope.clientId ? " in workspace" : ""}
        </p>
        {filtered.length > 0 && (
          <CreateIssueForm
            projects={scope.projectId ? projects.filter((p) => p.id === scope.projectId) : projects}
            users={users}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="ops-card flex min-h-[280px] flex-col items-center justify-center p-10 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-900 dark:text-white">No issues in this workspace</p>
          <p className="mt-1 text-sm text-slate-500">
            Report construction defects and site issues for the active project.
          </p>
          <div className="mt-4">
            <CreateIssueForm projects={projects} users={users} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {COLUMNS.map((status) => (
            <div
              key={status}
              className={cn(
                "flex min-h-[420px] flex-col rounded-2xl border p-3 transition-colors",
                COLUMN_STYLES[status],
                dragOverColumn === status && "ring-2 ring-brand-accent/40"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const issueId = e.dataTransfer.getData("text/issue-id");
                if (issueId) handleDrop(status, issueId);
                setDraggingId(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ISSUE_STATUS_LABELS[status]}
                  </h3>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {byStatus[status].length}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {byStatus[status].map((issue) => (
                  <article
                    key={issue.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/issue-id", issue.id);
                      setDraggingId(issue.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setSelectedIssue(issue)}
                    className={cn(
                      "ops-card cursor-pointer p-3 transition-all hover:shadow-md",
                      draggingId === issue.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-slate-900 dark:text-white">
                          {issue.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {issue.project?.name ?? "Project"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge className={cn("text-[10px]", getStatusColor(issue.priority))}>
                            {ISSUE_PRIORITY_LABELS[issue.priority as IssuePriority]}
                          </Badge>
                          {(issue.issue_images?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {issue.issue_images!.length} photo
                              {issue.issue_images!.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                        {issue.due_date && (
                          <p className="mt-2 text-[11px] text-slate-400">
                            Due {formatDate(issue.due_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {byStatus[status].length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200/80 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                    Drop issues here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <IssueDetailDrawer
        issue={selectedIssue}
        users={users}
        open={Boolean(selectedIssue)}
        onOpenChange={(open) => {
          if (!open) setSelectedIssue(null);
        }}
      />
    </div>
  );
}
