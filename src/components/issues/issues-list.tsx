"use client";

import { useMemo, useState } from "react";
import { IssueCard } from "@/components/issues/issue-card";
import { Button } from "@/components/ui/button";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type IssueWithRelations,
} from "@/lib/types";

interface IssuesListProps {
  issues: Array<IssueWithRelations & { projectName?: string }>;
  showProject?: boolean;
}

const ALL = "all" as const;

export function IssuesList({ issues, showProject = true }: IssuesListProps) {
  const [statusFilter, setStatusFilter] = useState<IssueStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | typeof ALL>(
    ALL
  );

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value={ALL}>All priorities</option>
          {(Object.keys(ISSUE_PRIORITY_LABELS) as IssuePriority[]).map((priority) => (
            <option key={priority} value={priority}>
              {ISSUE_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No issues match the selected filters.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              showProject={showProject}
              projectHref={
                issue.project_id
                  ? `/dashboard/projects/${issue.project_id}`
                  : undefined
              }
            />
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
      variant={active ? "accent" : "outline"}
      size="sm"
      onClick={onClick}
      className="text-xs"
    >
      {label}
    </Button>
  );
}
