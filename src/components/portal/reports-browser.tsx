"use client";

import { useMemo, useState } from "react";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";
import type { Report, ReportType } from "@/lib/types";

type ReportRow = Report & { projectName: string };

const REPORT_TYPES: ReportType[] = [
  "progress_report",
  "quality_report",
  "inspection_report",
  "safety_report",
];

export function ReportsBrowser({ reports }: { reports: ReportRow[] }) {
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
            <div
              key={report.id}
              className="portal-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
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
                <Badge className={getStatusColor(report.report_type)}>
                  {formatStatus(report.report_type)}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-1.5 h-4 w-4" />
                    Preview
                  </a>
                </Button>
                <Button variant="default" size="sm" className="bg-slate-900 hover:bg-slate-800" asChild>
                  <a href={report.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
