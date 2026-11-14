"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Download, Loader2, Eye } from "lucide-react";
import { getReportSignedUrl } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors/public";

const PdfDocumentViewer = dynamic(
  () =>
    import("@/components/projects/pdf-document-viewer").then(
      (mod) => mod.PdfDocumentViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        <span className="text-sm text-slate-500">Loading PDF viewer...</span>
      </div>
    ),
  }
);

interface PdfPreviewProps {
  reportId: string;
  fileName: string;
  title: string;
}

export function PdfPreview({ reportId, fileName, title }: PdfPreviewProps) {
  const [open, setOpen] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await getReportSignedUrl(reportId);
      setSignedUrl(url);
      return url;
    } catch (err) {
      const message = getErrorMessage(err, "Failed to load PDF");
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  async function handlePreview() {
    setOpen(true);
    setPageNumber(1);
    if (!signedUrl) {
      await fetchSignedUrl();
    }
  }

  async function handleDownload() {
    const url = signedUrl ?? (await fetchSignedUrl());
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={handlePreview} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-1.5 h-4 w-4" />
          )}
          Preview
        </Button>
        <Button
          variant="default"
          size="sm"
          className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          onClick={handleDownload}
          disabled={loading}
          aria-label={`Download ${fileName}`}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Download
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setPageNumber(1);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl w-[95vw] overflow-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              <span className="text-sm text-slate-500">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="py-12 text-center text-sm text-red-500">{error}</div>
          )}

          {signedUrl && !loading && !error && (
            <PdfDocumentViewer
              signedUrl={signedUrl}
              pageNumber={pageNumber}
              numPages={numPages}
              onPageChange={setPageNumber}
              onNumPages={setNumPages}
              onError={setError}
              onDownload={handleDownload}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
