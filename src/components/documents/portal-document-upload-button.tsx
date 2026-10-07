"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createPortalDocumentUploadUrl,
  recordPortalDocument,
} from "@/lib/actions/portal-documents";
import {
  PORTAL_DOCUMENT_ACCEPT,
  PORTAL_DOCUMENT_MAX_BYTES,
  documentNameFromFile,
  portalDocumentContentType,
} from "@/lib/portal/document-upload";
import { DOCUMENT_CATEGORY_LABELS, STORAGE_BUCKETS, type DocumentCategory } from "@/lib/types";
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
import { getErrorMessage } from "@/lib/errors/public";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalDocumentUploadButton({
  projects,
  defaultProjectId,
}: {
  projects: { id: string; name: string }[];
  defaultProjectId?: string | null;
}) {
  const router = useRouter();
  const initialProjectId =
    projects.find((p) => p.id === defaultProjectId)?.id ?? projects[0]?.id ?? "";

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setProjectId(initialProjectId);
    setFile(null);
    setName("");
    setCategory("other");
    setDescription("");
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!next) return;
    if (next.size > PORTAL_DOCUMENT_MAX_BYTES) {
      setError("Files must be 100 MB or smaller.");
      return;
    }
    setError(null);
    setFile(next);
    if (!name.trim()) setName(documentNameFromFile(next.name));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !projectId || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const ticket = await createPortalDocumentUploadUrl({
        projectId,
        fileName: file.name,
        fileSize: file.size,
      });
      if (!ticket.ok) {
        setError(ticket.error);
        return;
      }

      const contentType = portalDocumentContentType(file);
      const { error: uploadError } = await createClient()
        .storage.from(STORAGE_BUCKETS.DOCUMENTS)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType });
      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const saved = await recordPortalDocument({
        projectId,
        path: ticket.path,
        name: name.trim() || documentNameFromFile(file.name),
        category,
        description,
        fileName: file.name,
        fileSize: file.size,
        mimeType: contentType,
      });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  }

  if (projects.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (uploading) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
          <Upload className="mr-1.5 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Share drawings, contracts, BOQs, or other files with your BuildView team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {projects.length > 1 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
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
            <Label htmlFor="portal-document-file">File</Label>
            <label
              htmlFor="portal-document-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <FileUp className="h-6 w-6 text-slate-400" />
              {file ? (
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {file.name}
                  <span className="ml-1 font-normal text-slate-500">({formatSize(file.size)})</span>
                </span>
              ) : (
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Click to choose a file
                </span>
              )}
              <span className="text-[11px] text-slate-500">
                PDF, Word, Excel, PowerPoint, images, ZIP, or CAD up to 100 MB
              </span>
            </label>
            <input
              id="portal-document-file"
              type="file"
              accept={PORTAL_DOCUMENT_ACCEPT}
              onChange={handleFileChange}
              className="sr-only"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-document-name">Document Name</Label>
            <Input
              id="portal-document-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground floor layout"
              maxLength={200}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {DOCUMENT_CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-document-description">Note (optional)</Label>
            <Textarea
              id="portal-document-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              disabled={uploading}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !projectId || uploading}
              className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
