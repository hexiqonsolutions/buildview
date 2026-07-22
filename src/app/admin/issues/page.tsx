import { AlertTriangle } from "lucide-react";
import { getAllUsers } from "@/lib/actions/data";
import {
  getScopedIssues,
  getScopedProjects,
  parseWorkspaceScopeFromParams,
} from "@/lib/admin/scope-server";
import { IssueKanban } from "@/components/admin/issues/issue-kanban";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import type { IssueWithRelations } from "@/lib/types";

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);

  const [issues, projects, users] = await Promise.all([
    getScopedIssues(scope),
    getScopedProjects(scope),
    getAllUsers(),
  ]);

  return (
    <OpsWorkspacePage
      title="Issues"
      description="Kanban board for construction defects and site issues. Drag cards between columns or open for full details."
      icon={AlertTriangle}
    >
      <IssueKanban
        issues={issues as IssueWithRelations[]}
        projects={projects}
        users={users}
      />
    </OpsWorkspacePage>
  );
}
