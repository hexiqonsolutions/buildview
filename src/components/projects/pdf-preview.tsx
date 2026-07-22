"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Download, Loader2, Eye } from "lucide-react";
import { getReportSignedUrl } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
      const message = err instanceof Error ? err.message : "Failed to load PDF";
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
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
          aria-label={`Download ${fileName}`}
        >
          <Download className="h-4 w-4" />
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
              <Loader2 className="h-6 w-6 animate-spin text-brand-accent" />
              <span className="text-sm text-slate-500">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="py-12 text-center text-sm text-red-500">{error}</div>
          )}

          {signedUrl && !loading && !error && (
            <>
              <div className="mb-4 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pageNumber} of {numPages || "—"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Download
                </Button>
              </div>
              <div className="flex justify-center overflow-x-auto">
                <Document
                  file={signedUrl}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  onLoadError={() => setError("Failed to render PDF.")}
                  loading={
                    <div className="flex items-center gap-2 py-12">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Rendering...
                    </div>
                  }
                >
                  <Page pageNumber={pageNumber} width={700} />
                </Document>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
