"use client";

import { useRef, useState } from "react";
import { Plus, Loader2, Upload, ImageIcon, X } from "lucide-react";
import { createIssue, addIssueImages } from "@/lib/actions/issues";
import { uploadIssueImageFile } from "@/lib/supabase/storage";
import { validateIssueImageFiles } from "@/lib/validations/issue";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type Project,
  type User,
} from "@/lib/types";
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

interface CreateIssueFormProps {
  projects: Project[];
  users?: User[];
}

export function CreateIssueForm({ projects, users = [] }: CreateIssueFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [status, setStatus] = useState<IssueStatus>("open");
  const [assignedTo, setAssignedTo] = useState<string>("none");
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }

  function resetForm() {
    setProjectId("");
    setPriority("medium");
    setStatus("open");
    setAssignedTo("none");
    setFiles([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const issueId = await createIssue({
        project_id: projectId,
        title: form.get("title") as string,
        description: (form.get("description") as string) || undefined,
        priority,
        status,
        location: (form.get("location") as string) || undefined,
        assigned_to: assignedTo === "none" ? null : assignedTo,
        due_date: (form.get("due_date") as string) || null,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="ops-btn-primary h-9">
          <Plus className="mr-1 h-4 w-4" /> Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId} required>
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

          <div className="space-y-2">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              name="title"
              required
              placeholder="Crack in Column C-14"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              name="description"
              rows={3}
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as IssuePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ISSUE_PRIORITY_LABELS) as IssuePriority[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {ISSUE_PRIORITY_LABELS[value]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as IssueStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ISSUE_STATUS_LABELS) as IssueStatus[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {ISSUE_STATUS_LABELS[value]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-location">Location on Site</Label>
            <Input
              id="issue-location"
              name="location"
              placeholder="Floor 8, Grid C-14"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issue-due-date">Due Date</Label>
              <Input id="issue-due-date" name="due_date" type="date" />
            </div>

            {users.length > 0 && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Photo Attachments</Label>
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
              <button
                type="button"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-500">
                  Drag & drop photos here, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Up to 10 images, 10 MB each
                </p>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
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
            disabled={loading || !projectId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Issue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
