"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProgressionExportData } from "@/lib/actions/progression-export";
import {
  buildProgressionExcelXml,
  downloadBlob,
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
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [pending, startTransition] = useTransition();

  function handleExport() {
    setError(null);
    if (format === "pdf") {
      if (from > to) {
        setError("From date must be on or before the to date.");
        return;
      }
      const url = `/report/progress/${projectId}?from=${from}&to=${to}`;
      const win = window.open(url, "_blank");
      if (!win) window.location.href = url;
      setOpen(false);
      return;
    }
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
        const xml = buildProgressionExcelXml(result.data);
        downloadBlob(
          `${slug || "progression"}-${stamp}.xls`,
          new Blob([xml], { type: "application/vnd.ms-excel" })
        );
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export progression</DialogTitle>
          <DialogDescription>
            Choose the period, then open a PDF report for clients or download Excel for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="progression-export-from">From</Label>
            <Input
              id="progression-export-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="progression-export-to">To</Label>
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

        <div role="radiogroup" aria-label="Export type" className="grid gap-2">
          {(
            [
              {
                value: "pdf",
                icon: FileText,
                title: "PDF progress report",
                body: "Completion, S-curve, floors, zones on the floor plan, changes with 360 evidence, and how the % is calculated.",
              },
              {
                value: "excel",
                icon: FileSpreadsheet,
                title: "Excel (.xls)",
                body: "Overview, floors, every checklist step and period activity.",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={format === opt.value}
              onClick={() => setFormat(opt.value)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                format === opt.value
                  ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-900"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
              )}
            >
              <opt.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span>
                <span className="block font-medium text-slate-900 dark:text-white">{opt.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{opt.body}</span>
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-slate-900 hover:bg-slate-800"
            onClick={handleExport}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                {format === "pdf" ? <FileText className="mr-1.5 h-4 w-4" /> : <Download className="mr-1.5 h-4 w-4" />}
                {format === "pdf" ? "Open PDF report" : "Download Excel"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
