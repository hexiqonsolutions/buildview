"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfPreview } from "@/components/projects/pdf-preview";
import { HighlightAnchor } from "@/components/portal/highlight-anchor";
import { formatDate, formatStatus } from "@/lib/utils";
import type { Report, ReportType } from "@/lib/types";

type ReportRow = Report & { projectName: string };

const REPORT_TYPES: ReportType[] = [
  "progress_report",
  "quality_report",
  "inspection_report",
  "safety_report",
];

export function ReportsBrowser({
  reports,
  highlightId,
}: {
  reports: ReportRow[];
  highlightId?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        search.trim() === "" ||
        report.title.toLowerCase().includes(search.toLowerCase()) ||
        report.projectName.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || report.report_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [reports, search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="portal-card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {REPORT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {formatStatus(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="portal-card py-12 text-center text-sm text-slate-500">
          No reports match your search.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => (
            <HighlightAnchor
              key={report.id}
              id={`report-${report.id}`}
              highlightId={highlightId ? `report-${highlightId}` : null}
            >
              <div className="portal-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{report.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {report.projectName} · {formatDate(report.report_date)}
                  </p>
                  {report.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{report.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PdfPreview
                    reportId={report.id}
                    fileName={report.file_name}
                    title={report.title}
                  />
                </div>
              </div>
            </HighlightAnchor>
          ))}
        </div>
      )}
    </div>
  );
}
