import { IssueCard } from "@/components/issues/issue-card";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AlertTriangle } from "lucide-react";
import type { IssueWithRelations } from "@/lib/types";

export function ProjectIssuesSection({
  issues,
  allowStatusUpdate = false,
  allowCreate = false,
  projectId,
}: {
  issues: IssueWithRelations[];
  allowStatusUpdate?: boolean;
  allowCreate?: boolean;
  projectId?: string;
}) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No issues reported yet."
        description={
          allowCreate
            ? "Report a construction issue or defect to track it here."
            : "Construction issues and defects will be tracked here."
        }
      >
        {allowCreate && projectId ? (
          <CreateIssueDialog
            projects={[{ id: projectId, name: "This project" }]}
            defaultProjectId={projectId}
          />
        ) : null}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {!allowStatusUpdate && (
        <p className="text-xs text-slate-500">
          Status is view-only for your role. Client Admin, Site Supervisor, and Site Engineer can
          update it.
        </p>
      )}
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          allowStatusUpdate={allowStatusUpdate}
        />
      ))}
      {allowCreate && projectId && issues.length > 0 && (
        <div className="flex justify-end pt-1">
          <CreateIssueDialog
            projects={[{ id: projectId, name: "This project" }]}
            defaultProjectId={projectId}
            triggerLabel="Report another issue"
            triggerClassName="bg-transparent text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          />
        </div>
      )}
    </div>
  );
}
