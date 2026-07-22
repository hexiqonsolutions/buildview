"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { getDocumentVersionHistory } from "@/lib/actions/documents";
import { DocumentDownloadButton } from "@/components/documents/document-download-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Document } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/utils";

export function DocumentVersionHistoryDialog({
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
  const [error, setError] = useState<string | null>(null);

  const groupId = document.document_group_id ?? document.id;

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const rows = await getDocumentVersionHistory(groupId);
      setVersions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load version history");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(next: boolean) {
    onOpenChange(next);
    if (next) {
      void loadHistory();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version history
          </DialogTitle>
          <p className="text-sm text-slate-500">{document.name}</p>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-slate-500">No version history available.</p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      v{version.version_number ?? 1}
                    </span>
                    {version.is_current && (
                      <Badge variant="secondary" className="text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{version.file_name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(version.created_at)} · {formatFileSize(version.file_size)}
                  </p>
                  {version.description && version.id !== document.id && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {version.description}
                    </p>
                  )}
                </div>
                <DocumentDownloadButton
                  documentId={version.id}
                  fileName={version.file_name}
                  showLabel={false}
                  size="icon"
                  variant="ghost"
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentVersionHistoryButton({ document }: { document: Document }) {
  const [open, setOpen] = useState(false);
  const hasHistory = (document.version_number ?? 1) > 1;

  if (!hasHistory) return null;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <History className="mr-2 h-4 w-4" />
        History
      </Button>
      <DocumentVersionHistoryDialog
        document={document}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
