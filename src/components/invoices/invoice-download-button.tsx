"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { getInvoiceDownloadUrl } from "@/lib/actions/admin";
import { downloadFileFromUrl } from "@/lib/download-file";
import { Button } from "@/components/ui/button";

interface InvoiceDownloadButtonProps {
  invoiceId: string;
  hasFile: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function InvoiceDownloadButton({
  invoiceId,
  hasFile,
  variant = "outline",
  size = "sm",
  className,
}: InvoiceDownloadButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hasFile) return null;

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      try {
        const { url, fileName } = await getInvoiceDownloadUrl(invoiceId);
        await downloadFileFromUrl(url, fileName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isPending}
        className={className ?? "shrink-0 cursor-pointer"}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Download
      </Button>
      {error ? <span className="max-w-[14rem] text-right text-xs text-red-500">{error}</span> : null}
    </div>
  );
}
