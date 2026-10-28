"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProgressionExportData } from "@/lib/actions/progression-export";
import {
  buildProgressionExcelXml,
  buildProgressionPdfHtml,
  downloadBlob,
  openHtmlPrintWindow,
} from "@/lib/progression/export-format";

function todayKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgoKolkata(days: number): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  now.setDate(now.getDate() - days);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ProgressionExportControls({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName?: string;
}) {
  const defaults = useMemo(
    () => ({
      from: daysAgoKolkata(29),
      to: todayKolkata(),
    }),
    []
  );
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyFormat, setBusyFormat] = useState<"excel" | "pdf" | null>(null);

  function runExport(format: "excel" | "pdf") {
    setError(null);
    setBusyFormat(format);
    startTransition(async () => {
      try {
        const result = await getProgressionExportData({ projectId, from, to });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const slug = (projectName ?? result.data.projectName)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48);
        const stamp = `${result.data.from}_to_${result.data.to}`;

        if (format === "excel") {
          const xml = buildProgressionExcelXml(result.data);
          downloadBlob(
            `${slug || "progression"}-${stamp}.xls`,
            new Blob([xml], { type: "application/vnd.ms-excel" })
          );
        } else {
          openHtmlPrintWindow(buildProgressionPdfHtml(result.data));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed.");
      } finally {
        setBusyFormat(null);
      }
    });
  }

  return (
    <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <Download className="h-4 w-4 text-slate-500" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Export progression</p>
          <p className="text-xs text-slate-500">
            Date range · building &amp; floor detail · Excel or PDF
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="progression-export-from" className="text-xs">
            From
          </Label>
          <Input
            id="progression-export-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="progression-export-to" className="text-xs">
            To
          </Label>
          <Input
            id="progression-export-to"
            type="date"
            value={to}
            min={from}
            max={todayKolkata()}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runExport("excel")}
        >
          {busyFormat === "excel" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          )}
          Export Excel
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800"
          disabled={pending}
          onClick={() => runExport("pdf")}
        >
          {busyFormat === "pdf" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-1.5 h-4 w-4" />
          )}
          Export PDF
        </Button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          Excel includes Summary, Building/Floor/Track, all Steps, and Period Activity sheets.
          PDF opens a print view — choose Save as PDF.
        </p>
      )}
    </div>
  );
}
