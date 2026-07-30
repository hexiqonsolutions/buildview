"use client";

import { useMemo, useState } from "react";
import { IssueCard } from "@/components/issues/issue-card";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { HighlightAnchor } from "@/components/portal/highlight-anchor";
import { Button } from "@/components/ui/button";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type IssueWithRelations,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface IssuesListProps {
  issues: Array<IssueWithRelations & { projectName?: string }>;
  showProject?: boolean;
  highlightId?: string | null;
  allowStatusUpdate?: boolean;
  allowCreate?: boolean;
  projects?: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}

const ALL = "all" as const;

export function IssuesList({
  issues,
  showProject = true,
  highlightId,
  allowStatusUpdate = false,
  allowCreate = false,
  projects = [],
  defaultProjectId,
}: IssuesListProps) {
  const [statusFilter, setStatusFilter] = useState<IssueStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (statusFilter !== ALL && issue.status !== statusFilter) return false;
      if (priorityFilter !== ALL && issue.priority !== priorityFilter) return false;
      return true;
    });
  }, [issues, statusFilter, priorityFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: issues.length };
    for (const issue of issues) {
      counts[issue.status] = (counts[issue.status] ?? 0) + 1;
    }
    return counts;
  }, [issues]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={statusFilter === ALL}
              onClick={() => setStatusFilter(ALL)}
              label={`All (${statusCounts.all ?? 0})`}
            />
            {(Object.keys(ISSUE_STATUS_LABELS) as IssueStatus[]).map((status) => (
              <FilterButton
                key={status}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                label={`${ISSUE_STATUS_LABELS[status]} (${statusCounts[status] ?? 0})`}
              />
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as IssuePriority | typeof ALL)
            }
            aria-label="Filter by priority"
            className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value={ALL}>All priorities</option>
            {(Object.keys(ISSUE_PRIORITY_LABELS) as IssuePriority[]).map((priority) => (
              <option key={priority} value={priority}>
                {ISSUE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>

        {allowCreate && projects.length > 0 && (
          <CreateIssueDialog
            projects={projects}
            defaultProjectId={defaultProjectId}
            triggerClassName="shrink-0"
          />
        )}
      </div>

      {!allowStatusUpdate && (
        <p className="text-xs text-slate-500">
          You can view every status. Only Client Admin, Site Supervisor, and Site Engineer can
          change status.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500">No issues match the selected filters.</p>
          {allowCreate && projects.length > 0 && (
            <div className="mt-4 flex justify-center">
              <CreateIssueDialog projects={projects} defaultProjectId={defaultProjectId} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <HighlightAnchor
              key={issue.id}
              id={`issue-${issue.id}`}
              highlightId={highlightId ? `issue-${highlightId}` : null}
            >
              <IssueCard
                issue={issue}
                showProject={showProject}
                allowStatusUpdate={allowStatusUpdate}
                projectHref={
                  issue.project_id ? `/dashboard/projects/${issue.project_id}` : undefined
                }
              />
            </HighlightAnchor>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "cursor-pointer text-xs transition-colors duration-200",
        active && "bg-slate-900 text-white hover:bg-slate-800"
      )}
    >
      {label}
    </Button>
  );
}
