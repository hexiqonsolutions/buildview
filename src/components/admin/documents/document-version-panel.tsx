"use client";

import { useState, useTransition } from "react";
import { History, Loader2, Upload } from "lucide-react";
import {
  getDocumentVersionHistory,
  replaceDocumentVersion,
} from "@/lib/actions/documents";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { validateDocumentFile } from "@/lib/validations/document";
import type { Document } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export function DocumentVersionPanel({
  document,
  open,
  onOpenChange,
}: {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [versions, setVersions] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");

  const groupId = document.document_group_id ?? document.id;

  async function loadHistory() {
    setLoading(true);
    try {
      const rows = await getDocumentVersionHistory(groupId);
      setVersions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(next: boolean) {
    onOpenChange(next);
    if (next) {
      setError(null);
      void loadHistory();
    }
  }

  function handleReplace(file: File) {
    const validationError = validateDocumentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const upload = await uploadDocumentFile(document.project_id, file);
        await replaceDocumentVersion({
          document_group_id: groupId,
          storage_path: upload.path,
          file_name: upload.fileName,
          file_size: upload.fileSize,
          mime_type: upload.mimeType,
          change_note: changeNote || undefined,
        });
        setChangeNote("");
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Replace failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {document.name}
            {(document.version_number ?? 1) > 1 && (
              <span className="text-xs font-normal text-slate-500">
                v{document.version_number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Upload new version
            </p>
            <Input
              className="mt-2"
              placeholder="Change note (optional)"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              disabled={pending}
            />
            <label className="mt-3 inline-flex cursor-pointer">
              <input
                type="file"
                className="hidden"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReplace(file);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={pending} asChild>
                <span>
                  {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Choose file
                </span>
              </Button>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="max-h-56 space-y-2 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500">Loading history…</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-slate-500">No version history yet.</p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
                >
                  <div>
                    <p className="font-medium">
                      v{v.version_number ?? 1}
                      {v.is_current && (
                        <span className="ml-2 text-xs text-brand-accent">Current</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{v.file_name}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(v.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
