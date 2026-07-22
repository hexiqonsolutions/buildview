import {
  getScopedProjects,
  getScopedReports,
  parseWorkspaceScopeFromParams,
} from "@/lib/admin/scope-server";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CreateReportForm } from "@/components/admin/create-report-form";
import { ReportCard } from "@/components/reports/report-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);
  const [reports, projects] = await Promise.all([
    getScopedReports(scope),
    getScopedProjects(scope),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <AdminPageHeader
        title="Reports"
        description="Upload and manage project progress reports scoped to the active workspace."
        actions={<CreateReportForm projects={projects} />}
      />

      <AdminTable
        data={reports}
        columns={[
          { key: "title", label: "Title" },
          {
            key: "project",
            label: "Project",
            render: (r) => (r.project as { name: string })?.name || "—",
          },
          {
            key: "report_type",
            label: "Type",
            render: (r) => (
              <Badge className={getStatusColor(r.report_type as string)}>
                {formatStatus(r.report_type as string)}
              </Badge>
            ),
          },
          {
            key: "report_date",
            label: "Date",
            render: (r) => formatDate(r.report_date as string),
          },
        ]}
        emptyMessage="No reports yet. Upload your first report."
      />

      {reports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-primary dark:text-white">
            Preview & Download
          </h2>
          {reports.map((report) => (
            <ReportCard
              key={report.id as string}
              report={report as Parameters<typeof ReportCard>[0]["report"]}
              projectName={(report.project as { name: string })?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
