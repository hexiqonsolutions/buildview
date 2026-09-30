"use client";

import { useMemo, useState } from "react";
import { Loader2, Maximize2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getMatterportEmbedUrl, isValidMatterportUrl } from "@/lib/matterport";

export interface MatterportViewerProps {
  /** 360° tour share URL or model ID */
  url: string;
  /** Accessible title for the iframe */
  title?: string;
  /** CSS class for the outer container */
  className?: string;
  /** iframe height in pixels (ignored when aspectRatio is used) */
  height?: number;
  /** Use 16:9 responsive aspect ratio container */
  aspectRatio?: boolean;
  /** Show toolbar with fullscreen button */
  showToolbar?: boolean;
}

export function MatterportViewer({
  url,
  title = "360° Virtual Tour",
  className,
  height = 480,
  aspectRatio = true,
  showToolbar = true,
}: MatterportViewerProps) {
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const isValid = useMemo(() => isValidMatterportUrl(url), [url]);
  const embedUrl = useMemo(() => getMatterportEmbedUrl(url), [url]);

  if (!isValid) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-100 p-8 text-center dark:bg-slate-800",
          className
        )}
      >
        <AlertCircle className="h-10 w-10 text-slate-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Invalid tour URL. Please check the tour link.
        </p>
      </div>
    );
  }

  const iframe = (
    <iframe
      src={embedUrl}
      title={title}
      allowFullScreen
      allow="fullscreen; xr-spatial-tracking"
      onLoad={() => setLoading(false)}
      className={cn(
        "w-full border-0",
        aspectRatio ? "absolute inset-0 h-full" : "rounded-lg"
      )}
      style={aspectRatio ? undefined : { height }}
    />
  );

  const viewer = (
    <div className={cn("relative overflow-hidden rounded-lg bg-slate-900", className)}>
      {loading && (
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-slate-900",
            aspectRatio && "aspect-video"
          )}
          style={aspectRatio ? undefined : { height }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      )}

      {aspectRatio ? (
        <div className="relative aspect-video w-full">{iframe}</div>
      ) : (
        iframe
      )}

      {showToolbar && (
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          <Button
            variant="overlay"
            size="sm"
            className="h-8"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
            Fullscreen
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {viewer}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[95vh] max-w-6xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <MatterportViewer
              url={url}
              title={title}
              aspectRatio
              showToolbar={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
