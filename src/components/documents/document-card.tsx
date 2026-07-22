import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentDownloadButton } from "@/components/documents/document-download-button";
import { DocumentVersionHistoryButton } from "@/components/documents/document-version-history-dialog";
import { formatStatus, formatFileSize } from "@/lib/utils";
import { DOCUMENT_CATEGORY_LABELS, type Document } from "@/lib/types";
import { FileText } from "lucide-react";

interface DocumentCardProps {
  document: Document;
  projectName?: string;
  folderName?: string;
}

export function DocumentCard({
  document,
  projectName,
  folderName,
}: DocumentCardProps) {
  const categoryLabel =
    DOCUMENT_CATEGORY_LABELS[document.category] ?? formatStatus(document.category);

  return (
    <Card className="glass-card border-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-accent/10">
            <FileText className="h-5 w-5 text-brand-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-brand-primary dark:text-white">
              {document.name}
            </h3>
            {document.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {document.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {projectName && <span>{projectName}</span>}
              {folderName && <span>· {folderName}</span>}
              <Badge variant="outline">{categoryLabel}</Badge>
              {(document.version_number ?? 1) > 1 && (
                <Badge variant="secondary">v{document.version_number}</Badge>
              )}
              <span>{formatFileSize(document.file_size)}</span>
              <span className="truncate text-xs">{document.file_name}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <DocumentVersionHistoryButton document={document} />
          <DocumentDownloadButton
            documentId={document.id}
            fileName={document.file_name}
          />
        </div>
      </CardContent>
    </Card>
  );
}
