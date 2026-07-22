"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Loader2, Upload, ImageIcon, X, Pencil } from "lucide-react";
import { createTimelineEvent, updateTimelineEvent, addTimelinePhotos } from "@/lib/actions/timeline";
import { uploadTimelinePhotoFile } from "@/lib/supabase/storage";
import { validateTimelinePhotoFiles } from "@/lib/validations/timeline";
import {
  DEFAULT_TRADE_COLORS,
  DEFAULT_TRADE_NAMES,
} from "@/lib/timeline/admin-timeline";
import type { Project, ProjectTour, Report, TimelineEvent } from "@/lib/types";
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

type TradeDraft = { name: string; percent: string };

function emptyTrades(): TradeDraft[] {
  return DEFAULT_TRADE_NAMES.map((name) => ({ name, percent: "" }));
}

function tradesFromEvent(event?: TimelineEvent | null): TradeDraft[] {
  const raw = Array.isArray(event?.trades) ? event!.trades : [];
  const byName = new Map(
    raw
      .filter((t): t is { name: string; percent: number } =>
        Boolean(t && typeof t === "object" && "name" in t)
      )
      .map((t) => [String((t as { name: string }).name), String((t as { percent: number }).percent)])
  );
  return DEFAULT_TRADE_NAMES.map((name) => ({
    name,
    percent: byName.get(name) ?? "",
  }));
}

interface CreateTimelineEventFormProps {
  projects: Project[];
  tours: Array<ProjectTour & { project?: { name: string } | null }>;
  reports: Array<Report & { project?: { name: string } | null }>;
  triggerLabel?: string;
  triggerClassName?: string;
  defaultProjectId?: string;
  /** When set, form updates this event instead of creating */
  editEvent?: TimelineEvent | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function CreateTimelineEventForm({
  projects,
  tours,
  reports,
  triggerLabel = "Add Milestone",
  triggerClassName,
  defaultProjectId,
  editEvent = null,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: CreateTimelineEventFormProps) {
  const isEdit = Boolean(editEvent?.id);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId ?? editEvent?.project_id ?? "");
  const [tourId, setTourId] = useState(editEvent?.tour_id ?? "none");
  const [reportId, setReportId] = useState(editEvent?.report_id ?? "none");
  const [status, setStatus] = useState<"in_progress" | "completed">(
    editEvent?.status === "completed" ? "completed" : "in_progress"
  );
  const [progressPercent, setProgressPercent] = useState(
    editEvent?.progress_percent != null ? String(editEvent.progress_percent) : ""
  );
  const [authorName, setAuthorName] = useState(editEvent?.author_name ?? "");
  const [whatsNewText, setWhatsNewText] = useState(
    Array.isArray(editEvent?.whats_new) ? editEvent!.whats_new!.join("\n") : ""
  );
  const [trades, setTrades] = useState<TradeDraft[]>(() => tradesFromEvent(editEvent));
  const [title, setTitle] = useState(editEvent?.title ?? "");
  const [eventDate, setEventDate] = useState(editEvent?.event_date ?? "");
  const [progressNote, setProgressNote] = useState(editEvent?.progress_note ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setProjectId(editEvent?.project_id ?? defaultProjectId ?? "");
    setTourId(editEvent?.tour_id ?? "none");
    setReportId(editEvent?.report_id ?? "none");
    setStatus(editEvent?.status === "completed" ? "completed" : "in_progress");
    setProgressPercent(
      editEvent?.progress_percent != null ? String(editEvent.progress_percent) : ""
    );
    setAuthorName(editEvent?.author_name ?? "");
    setWhatsNewText(Array.isArray(editEvent?.whats_new) ? editEvent!.whats_new!.join("\n") : "");
    setTrades(tradesFromEvent(editEvent));
    setTitle(editEvent?.title ?? "");
    setEventDate(editEvent?.event_date ?? "");
    setProgressNote(editEvent?.progress_note ?? "");
    setFiles([]);
    setError(null);
  }, [open, editEvent, defaultProjectId]);

  const projectTours = useMemo(
    () => tours.filter((tour) => tour.project_id === projectId && !tour.deleted_at),
    [tours, projectId]
  );

  const projectReports = useMemo(
    () => reports.filter((report) => report.project_id === projectId && !report.deleted_at),
    [reports, projectId]
  );

  function handleFileSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const next = [...files, ...Array.from(selected)];
    const validationError = validateTimelinePhotoFiles(next);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }

  function resetForm() {
    setProjectId(defaultProjectId ?? "");
    setTourId("none");
    setReportId("none");
    setStatus("in_progress");
    setProgressPercent("");
    setAuthorName("");
    setWhatsNewText("");
    setTrades(emptyTrades());
    setTitle("");
    setEventDate("");
    setProgressNote("");
    setFiles([]);
    setError(null);
  }

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    setTourId("none");
    setReportId("none");
  }

  function parseProgressFields() {
    const whats_new = whatsNewText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    const tradeRows = trades
      .map((t) => {
        const percent = t.percent.trim() === "" ? null : Number(t.percent);
        if (percent == null || Number.isNaN(percent)) return null;
        return {
          name: t.name,
          percent: Math.min(100, Math.max(0, Math.round(percent))),
          color: DEFAULT_TRADE_COLORS[t.name],
        };
      })
      .filter((t): t is { name: string; percent: number; color: string } => t != null);

    const progress_percent =
      progressPercent.trim() === "" ? null : Math.min(100, Math.max(0, Math.round(Number(progressPercent))));

    if (progressPercent.trim() !== "" && (progress_percent == null || Number.isNaN(progress_percent))) {
      throw new Error("Overall progress must be a number from 0–100");
    }

    return {
      status,
      progress_percent,
      trades: tradeRows,
      whats_new,
      author_name: authorName.trim() || null,
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId && !isEdit) return;

    setLoading(true);
    setError(null);

    try {
      const progressFields = parseProgressFields();

      if (isEdit && editEvent) {
        await updateTimelineEvent({
          id: editEvent.id,
          event_date: eventDate,
          title,
          progress_note: progressNote || null,
          tour_id: tourId === "none" ? null : tourId,
          report_id: reportId === "none" ? null : reportId,
          ...progressFields,
        });

        if (files.length > 0) {
          const uploads = await Promise.all(
            files.map((file) => uploadTimelinePhotoFile(editEvent.project_id, editEvent.id, file))
          );
          await addTimelinePhotos(
            editEvent.id,
            uploads.map((upload, index) => ({
              storage_path: upload.path,
              file_name: upload.fileName,
              sort_order: index,
            }))
          );
        }
      } else {
        const eventId = await createTimelineEvent({
          project_id: projectId,
          event_date: eventDate,
          title,
          progress_note: progressNote || undefined,
          tour_id: tourId === "none" ? null : tourId,
          report_id: reportId === "none" ? null : reportId,
          ...progressFields,
        });

        if (files.length > 0) {
          const uploads = await Promise.all(
            files.map((file) => uploadTimelinePhotoFile(projectId, eventId, file))
          );
          await addTimelinePhotos(
            eventId,
            uploads.map((upload, index) => ({
              storage_path: upload.path,
              file_name: upload.fileName,
              sort_order: index,
            }))
          );
        }
      }

      setOpen(false);
      if (!isEdit) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save timeline milestone");
    }

    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEdit) resetForm();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" className={cn("ops-btn-primary h-9", triggerClassName)}>
            {isEdit ? <Pencil className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Update Timeline Milestone" : "Add Timeline Milestone"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={handleProjectChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeline-date">Date</Label>
              <Input
                id="timeline-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "in_progress" | "completed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline-title">Title</Label>
            <Input
              id="timeline-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Jul 2026 — Construction Progress"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline-author">Author</Label>
            <Input
              id="timeline-author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Site engineer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline-note">Overview</Label>
            <Textarea
              id="timeline-note"
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="Describe construction progress for this milestone..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline-progress">Overall progress (%)</Label>
            <Input
              id="timeline-progress"
              type="number"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => setProgressPercent(e.target.value)}
              placeholder="e.g. 62"
            />
          </div>

          <div className="space-y-2">
            <Label>Trade progress (%)</Label>
            <div className="grid grid-cols-2 gap-3">
              {trades.map((trade, index) => (
                <div key={trade.name} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{trade.name}</p>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={trade.percent}
                    onChange={(e) => {
                      const next = [...trades];
                      next[index] = { ...trade, percent: e.target.value };
                      setTrades(next);
                    }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline-whats-new">What&apos;s new (one per line)</Label>
            <Textarea
              id="timeline-whats-new"
              rows={4}
              value={whatsNewText}
              onChange={(e) => setWhatsNewText(e.target.value)}
              placeholder={"Level structural work advanced\nMEP rough-in scheduled\nProgress photos uploaded"}
            />
          </div>

          {projectId && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Matterport Tour</Label>
                <Select value={tourId} onValueChange={setTourId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projectTours.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Linked Report</Label>
                <Select value={reportId} onValueChange={setReportId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projectReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Progress Photos</Label>
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
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <button type="button" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-500">Drag & drop photos here, or click to browse</p>
                <p className="mt-1 text-xs text-slate-400">Up to 20 photos, 10 MB each</p>
              </button>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ImageIcon className="h-4 w-4 shrink-0 text-brand-accent" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            className="ops-btn-primary w-full"
            disabled={loading || (!isEdit && !projectId)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Milestone" : "Create Milestone"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
