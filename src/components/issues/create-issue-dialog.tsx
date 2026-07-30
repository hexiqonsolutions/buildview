"use client";

import { useRef, useState } from "react";
import { Plus, Loader2, Upload, ImageIcon, X } from "lucide-react";
import { createIssue, addIssueImages } from "@/lib/actions/issues";
import { uploadIssueImageFile } from "@/lib/supabase/storage";
import { validateIssueImageFiles } from "@/lib/validations/issue";
import { ISSUE_PRIORITY_LABELS, type IssuePriority } from "@/lib/types";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

interface CreateIssueDialogProps {
  projects: ProjectOption[];
  /** Prefill / lock to a single project (e.g. project detail page). */
  defaultProjectId?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Compact trigger for toolbars */
  size?: "sm" | "default";
}

export function CreateIssueDialog({
  projects,
  defaultProjectId,
  triggerLabel = "Report Issue",
  triggerClassName,
  size = "sm",
}: CreateIssueDialogProps) {
  const lockedProject =
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : projects.length === 1
        ? projects[0].id
        : "";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(lockedProject);
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const next = [...files, ...Array.from(selected)];
    const validationError = validateIssueImageFiles(next);
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

  function resetForm() {
    setProjectId(lockedProject);
    setPriority("medium");
    setFiles([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const issueId = await createIssue({
        project_id: projectId,
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        priority,
        status: "open",
        location: (form.get("location") as string) || undefined,
      });

      if (files.length > 0) {
        const uploads = await Promise.all(
          files.map((file) => uploadIssueImageFile(projectId, issueId, file))
        );
        await addIssueImages(
          issueId,
          uploads.map((upload, index) => ({
            storage_path: upload.path,
            file_name: upload.fileName,
            sort_order: index,
          }))
        );
      }

      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    }

    setLoading(false);
  }

  if (projects.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
        else if (lockedProject) setProjectId(lockedProject);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size={size}
          className={cn(
            "cursor-pointer bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
            triggerClassName
          )}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Report an issue</DialogTitle>
          <DialogDescription>
            Describe the site problem. It starts as Open — supervisors and engineers can update
            status later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!(defaultProjectId || projects.length === 1) && (
            <div className="space-y-1.5">
              <Label htmlFor="portal-issue-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger id="portal-issue-project" className="cursor-pointer">
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

          {(defaultProjectId || projects.length === 1) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
              <span className="text-slate-500">Project · </span>
              <span className="font-medium text-slate-900 dark:text-white">
                {projects.find((p) => p.id === projectId)?.name ?? "Selected project"}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="portal-issue-title">Title</Label>
            <Input
              id="portal-issue-title"
              name="title"
              required
              minLength={2}
              placeholder="e.g. Debris on 3rd floor stairwell"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-issue-description">Description</Label>
            <Textarea
              id="portal-issue-description"
              name="description"
              rows={3}
              placeholder="What happened, where, and any safety notes…"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="portal-issue-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as IssuePriority)}
              >
                <SelectTrigger id="portal-issue-priority" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ISSUE_PRIORITY_LABELS) as IssuePriority[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ISSUE_PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-issue-location">Location on site</Label>
              <Input
                id="portal-issue-location"
                name="location"
                placeholder="Building / floor / area"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Photos (optional)</Label>
            <div
              className={cn(
                "rounded-xl border-2 border-dashed p-5 text-center transition-colors duration-200",
                dragOver
                  ? "border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/40"
                  : "border-slate-200 dark:border-slate-700"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Drop photos here, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">Up to 10 images, 10 MB each</p>
              </button>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full cursor-pointer bg-slate-900 hover:bg-slate-800"
            disabled={loading || !projectId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit issue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
