import {
  getPortalScopedIssues,
  getPortalScopedProjects,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { IssuesList } from "@/components/issues/issues-list";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
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

  const [projects, issues] = await Promise.all([
    getPortalScopedProjects(scope),
    getPortalScopedIssues(scope),
  ]);

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
      description="View-only tracking of construction issues and defects."
      icon={AlertTriangle}
      eyebrow="Site Quality"
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Issues" />

        {issuesWithProject.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No issues in this workspace"
            description="Site issues for the selected project and location will appear here."
            variant="intel"
          />
        ) : (
          <div className="intel-card p-5">
            <IssuesList issues={issuesWithProject} showProject={projects.length > 1} />
          </div>
        )}
      </div>
    </IntelPage>
  );
}
