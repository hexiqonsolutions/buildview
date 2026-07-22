"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { getDocumentSignedUrl } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";

interface DocumentDownloadButtonProps {
  documentId: string;
  fileName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function DocumentDownloadButton({
  documentId,
  fileName,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: DocumentDownloadButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      try {
        const { url, fileName: name } = await getDocumentSignedUrl(documentId);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isPending}
        className="shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        )}
        {showLabel && "Download"}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
