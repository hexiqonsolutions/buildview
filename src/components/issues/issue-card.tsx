import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IssueImageGallery } from "@/components/issues/issue-image-gallery";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssueWithRelations,
} from "@/lib/types";

interface IssueCardProps {
  issue: IssueWithRelations & { projectName?: string };
  showProject?: boolean;
  projectHref?: string;
}

export function IssueCard({
  issue,
  showProject = false,
  projectHref,
}: IssueCardProps) {
  const activeImages =
    issue.issue_images?.filter((image) => !image.deleted_at) ?? [];

  return (
    <Card className="glass-card border-0">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-brand-primary dark:text-white">
              {issue.title}
            </h3>

            {showProject && issue.projectName && (
              <p className="mt-1 text-sm text-slate-500">
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="hover:text-brand-accent hover:underline"
                  >
                    {issue.projectName}
                  </Link>
                ) : (
                  issue.projectName
                )}
              </p>
            )}

            {issue.description && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {issue.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(issue.priority)}>
                {ISSUE_PRIORITY_LABELS[issue.priority]}
              </Badge>
              <Badge className={getStatusColor(issue.status)}>
                {ISSUE_STATUS_LABELS[issue.status]}
              </Badge>
              {issue.location && (
                <span className="text-xs text-slate-500">{issue.location}</span>
              )}
              {issue.assigned_user && (
                <span className="text-xs text-slate-500">
                  Assigned: {issue.assigned_user.full_name}
                </span>
              )}
            </div>

            {activeImages.length > 0 && (
              <IssueImageGallery images={activeImages} />
            )}
          </div>

          <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right">
            {issue.due_date && <p>Due: {formatDate(issue.due_date)}</p>}
            <p className="mt-1">Reported: {formatDate(issue.created_at)}</p>
            {issue.resolved_at && (
              <p className="mt-1 text-green-600 dark:text-green-400">
                Resolved: {formatDate(issue.resolved_at)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
