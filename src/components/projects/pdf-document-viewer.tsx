"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PDF_OPTIONS = { isEvalSupported: false };

export function PdfDocumentViewer({
  signedUrl,
  pageNumber,
  numPages,
  onPageChange,
  onNumPages,
  onError,
  onDownload,
}: {
  signedUrl: string;
  pageNumber: number;
  numPages: number;
  onPageChange: (page: number) => void;
  onNumPages: (n: number) => void;
  onError: (message: string) => void;
  onDownload: () => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={pageNumber <= 1}
          onClick={() => onPageChange(pageNumber - 1)}
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
          onClick={() => onPageChange(pageNumber + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-1.5 h-4 w-4" />
          Download
        </Button>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <Document
          file={signedUrl}
          options={PDF_OPTIONS}
          onLoadSuccess={({ numPages: n }) => onNumPages(n)}
          onLoadError={() => onError("Failed to render PDF.")}
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
  );
}
