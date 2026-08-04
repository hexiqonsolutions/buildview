"use client";

import { useState, useTransition } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { importLeadsAction } from "@/lib/leads/actions";
import { parseCsvFile, parseExcelFile } from "@/lib/leads/import-export";

type LeadImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LeadImportDialog({ open, onOpenChange }: LeadImportDialogProps) {
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [rows, setRows] = useState<unknown[]>([]);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const lower = file.name.toLowerCase();
      let parsed: unknown[] = [];

      if (lower.endsWith(".csv")) {
        const text = await file.text();
        parsed = parseCsvFile(text);
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        parsed = parseExcelFile(buffer);
      } else {
        toast.error("Use a .csv or .xlsx file");
        return;
      }

      setFileName(file.name);
      setRows(parsed);
      setPreviewCount(parsed.length);
      toast.success(`Ready to import ${parsed.length} rows`);
    } catch (error) {
      console.error(error);
      toast.error("Could not parse file");
    }
  }

  function onImport() {
    if (!rows.length) {
      toast.error("Choose a file first");
      return;
    }

    startTransition(async () => {
      const result = await importLeadsAction(rows);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Imported ${result.data?.imported ?? 0}` +
          (result.data?.failed
            ? ` · ${result.data.failed} rows skipped`
            : "")
      );
      setRows([]);
      setFileName(null);
      setPreviewCount(0);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel. Required columns: company, contactName. Tags
            can be pipe or comma separated.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 px-6 py-10 text-center transition-colors hover:border-orange-500/40">
          <Upload className="size-6 text-orange-400" />
          <div>
            <p className="text-sm font-medium text-white">
              Drop file or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-500">.csv, .xlsx</p>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onFileChange}
          />
        </label>

        {fileName ? (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm">
            <FileSpreadsheet className="size-4 text-orange-400" />
            <div className="min-w-0">
              <p className="truncate text-white">{fileName}</p>
              <p className="text-xs text-zinc-500">{previewCount} valid rows</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onImport} disabled={pending || !rows.length}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
