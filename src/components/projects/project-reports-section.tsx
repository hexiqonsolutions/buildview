import { ReportCard } from "@/components/reports/report-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileText } from "lucide-react";
import type { Report } from "@/lib/types";

export function ProjectReportsSection({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No reports available yet."
        description="Progress and inspection reports will be uploaded here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}
