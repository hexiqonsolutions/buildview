import {
  getPortalScopedProjects,
  getPortalScopedReports,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { ReportsBrowser } from "@/components/portal/reports-browser";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  const [projects, reports] = await Promise.all([
    getPortalScopedProjects(scope),
    getPortalScopedReports(scope),
  ]);

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const reportsWithProject = reports
    .map((report) => ({
      ...report,
      projectName: projectNames.get(report.project_id) ?? "Project",
    }))
    .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());

  return (
    <IntelPage
      title="Reports"
      description="Search, preview, and download project reports."
      icon={FileText}
      eyebrow="Progress Reports"
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Reports" />

        {reportsWithProject.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports in this workspace"
            description="Progress reports for the selected project and location will appear here."
            variant="intel"
          />
        ) : (
          <ReportsBrowser reports={reportsWithProject} />
        )}
      </div>
    </IntelPage>
  );
}
