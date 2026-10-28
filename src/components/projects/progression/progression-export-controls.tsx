"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  function handleExport() {
    setError(null);
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
            Choose the date range, then download an Excel file with building and floor detail.
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

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900/50">
          <p className="font-medium text-slate-900 dark:text-white">Export type</p>
          <p className="mt-0.5 text-xs text-slate-500">Excel (.xls) — Overview, Floors, Steps, Period activity</p>
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
                <Download className="mr-1.5 h-4 w-4" />
                Download Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
