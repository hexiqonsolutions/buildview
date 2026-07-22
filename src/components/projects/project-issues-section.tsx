import { IssueCard } from "@/components/issues/issue-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AlertTriangle } from "lucide-react";
import type { IssueWithRelations } from "@/lib/types";

export function ProjectIssuesSection({ issues }: { issues: IssueWithRelations[] }) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No issues reported yet."
        description="Construction issues and defects will be tracked here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
