"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Loader2, Upload, FileText, X } from "lucide-react";
import { createDocument } from "@/lib/actions/admin";
import { getProjectFolders } from "@/lib/actions/data";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { validateDocumentFile } from "@/lib/validations/document";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type DocumentFolder,
  type Project,
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

interface CreateDocumentFormProps {
  projects?: Project[];
  fixedProjectId?: string;
  triggerLabel?: string;
}

export function CreateDocumentForm({
  projects = [],
  fixedProjectId,
  triggerLabel = "Upload Document",
}: CreateDocumentFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [folderId, setFolderId] = useState("none");
  const [category, setCategory] = useState<DocumentCategory>("drawings");
  const [file, setFile] = useState<File | null>(null);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId) {
      setFolders([]);
      setFolderId("none");
      return;
    }
    getProjectFolders(projectId).then(setFolders);
  }, [projectId]);

  function handleFileSelect(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateDocumentFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !projectId) return;

    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const selectedFolderId = folderId !== "none" ? folderId : null;
      const upload = await uploadDocumentFile(projectId, file, selectedFolderId);

      await createDocument({
        project_id: projectId,
        name: form.get("name") as string,
        category,
        description: (form.get("description") as string) || undefined,
        folder_id: selectedFolderId ?? undefined,
        storage_path: upload.path,
        file_name: upload.fileName,
        file_size: upload.fileSize,
        mime_type: upload.mimeType,
      });

      setOpen(false);
      setFile(null);
      setProjectId(fixedProjectId ?? "");
      setFolderId("none");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      if (/server components render/i.test(message)) {
        setError(
          "Upload may have succeeded, but the page failed to refresh. Close this dialog and refresh the documents list."
        );
      } else {
        setError(message);
      }
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
          <DialogTitle>Upload Document</DialogTitle>
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

          {projectId && folders.length > 0 && (
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="No folder (unfiled)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder (unfiled)</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input id="doc-name" name="name" required placeholder="Structural Drawings Rev C" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as DocumentCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea id="doc-description" name="description" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>File</Label>
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
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileSelect(e.dataTransfer.files[0] ?? null);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
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
                    Drag & drop a file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Max 100 MB</p>
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
            Upload Document
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
