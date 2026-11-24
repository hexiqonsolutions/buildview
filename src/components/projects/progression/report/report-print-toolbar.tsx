"use client";

import { ArrowLeft, Printer } from "lucide-react";

/** Screen-only bar above the report: back, and Save as PDF (browser print). */
export function ReportPrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="report-no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <a
          href={backHref}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Progression
        </a>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">In the print dialog, choose “Save as PDF”.</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
