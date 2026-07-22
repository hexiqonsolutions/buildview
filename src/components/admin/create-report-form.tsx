"use client";

import { useState, useRef } from "react";
import { Plus, Loader2, Upload, FileText, X } from "lucide-react";
import { createReport } from "@/lib/actions/admin";
import { uploadReportFile } from "@/lib/supabase/storage";
import { validateReportFile } from "@/lib/validations/report";
import { REPORT_TYPE_LABELS, type Project, type ReportType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateReportFormProps {
  projects?: Project[];
  fixedProjectId?: string;
  triggerLabel?: string;
}

export function CreateReportForm({
  projects = [],
  fixedProjectId,
  triggerLabel = "Upload Report",
}: CreateReportFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [reportType, setReportType] = useState<ReportType>("progress_report");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateReportFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !projectId) return;

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const upload = await uploadReportFile(projectId, file);

      await createReport({
        project_id: projectId,
        title: form.get("title") as string,
        report_type: reportType,
        report_date: form.get("report_date") as string,
        description: (form.get("description") as string) || undefined,
        storage_path: upload.path,
        file_name: upload.fileName,
        file_size: upload.fileSize,
        mime_type: upload.mimeType,
      });

      setOpen(false);
      setFile(null);
      setProjectId(fixedProjectId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload report");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="ops-btn-primary h-9">
          <Plus className="mr-1 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedProjectId && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title</Label>
            <Input id="report-title" name="title" required placeholder="January Progress Report" />
          </div>

          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(v) => setReportType(v as ReportType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-date">Report Date</Label>
            <Input id="report-date" name="report_date" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>PDF File</Label>
            <div
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? "border-brand-accent bg-brand-accent/5"
                  : "border-slate-200 dark:border-slate-700"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-brand-accent" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Drag & drop a PDF here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Max 50 MB</p>
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="ops-btn-primary w-full"
            disabled={loading || !projectId || !file}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Report
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
