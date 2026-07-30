import {
  broadPortalListScope,
  getPortalScopedIssues,
  getPortalScopedProjects,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { IssuesList } from "@/components/issues/issues-list";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { firstSearchParam } from "@/lib/portal/search-params";
import { getCurrentUser } from "@/lib/actions/auth";
import {
  canCreateProjectIssue,
  canUpdateIssueStatus,
} from "@/lib/auth/permissions";
import { AlertTriangle } from "lucide-react";
import type { IssueWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);
  const listScope = broadPortalListScope(scope);
  const highlightIssueId = firstSearchParam(params.issue);

  const [user, projects, issues] = await Promise.all([
    getCurrentUser(),
    getPortalScopedProjects(listScope),
    getPortalScopedIssues(listScope),
  ]);

  const allowStatusUpdate = user ? canUpdateIssueStatus(user.role) : false;
  const allowCreate = user ? canCreateProjectIssue(user.role) : false;
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const issuesWithProject = issues
    .map((issue) => ({
      ...issue,
      projectName: projectNames.get(issue.project_id) ?? "Project",
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Array<
    IssueWithRelations & { projectName: string }
  >;

  return (
    <IntelPage
      title="Issues"
      description="Track construction issues and update their status as work progresses."
      icon={AlertTriangle}
      eyebrow="Site Quality"
      actions={
        allowCreate && projectOptions.length > 0 ? (
          <CreateIssueDialog
            projects={projectOptions}
            defaultProjectId={scope.projectId ?? undefined}
          />
        ) : undefined
      }
    >
      <div className="space-y-6">
        {issuesWithProject.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No issues in this workspace"
            description={
              allowCreate
                ? "Report a site issue to start tracking defects and snags for this project."
                : "Site issues for the selected project and location will appear here."
            }
            variant="intel"
            action={
              allowCreate && projectOptions.length > 0 ? (
                <CreateIssueDialog
                  projects={projectOptions}
                  defaultProjectId={scope.projectId ?? undefined}
                />
              ) : undefined
            }
          />
        ) : (
          <div className="intel-card p-5">
            <IssuesList
              issues={issuesWithProject}
              showProject={projects.length > 1}
              highlightId={highlightIssueId}
              allowStatusUpdate={allowStatusUpdate}
              allowCreate={allowCreate}
              projects={projectOptions}
              defaultProjectId={scope.projectId ?? undefined}
            />
          </div>
        )}
      </div>
    </IntelPage>
  );
}
