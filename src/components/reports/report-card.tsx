import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PdfPreview } from "@/components/projects/pdf-preview";
import { formatDate, formatStatus, getStatusColor, formatFileSize } from "@/lib/utils";
import type { Report } from "@/lib/types";

interface ReportCardProps {
  report: Report;
  projectName?: string;
}

export function ReportCard({ report, projectName }: ReportCardProps) {
  return (
    <Card className="glass-card border-0">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-brand-primary dark:text-white">
            {report.title}
          </h3>
          {report.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {report.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {projectName && <span>{projectName}</span>}
            <Badge className={getStatusColor(report.report_type)}>
              {formatStatus(report.report_type)}
            </Badge>
            <span>{formatDate(report.report_date)}</span>
            <span>{formatFileSize(report.file_size)}</span>
          </div>
        </div>
        <PdfPreview
          reportId={report.id}
          fileName={report.file_name}
          title={report.title}
        />
      </CardContent>
    </Card>
  );
}
