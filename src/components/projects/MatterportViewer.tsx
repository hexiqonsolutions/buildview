"use client";

import { useEffect, useMemo, useState } from "react";
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
  /** Stretch to the parent's height on phones (used by the fullscreen dialog) */
  fill?: boolean;
}

export function MatterportViewer({
  url,
  title = "360° Virtual Tour",
  className,
  height = 480,
  aspectRatio = true,
  showToolbar = true,
  fill = false,
}: MatterportViewerProps) {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const isValid = useMemo(() => isValidMatterportUrl(url), [url]);
  const embedUrl = useMemo(() => getMatterportEmbedUrl(url), [url]);

  // A server-rendered iframe can finish loading before hydration attaches onLoad
  // (common on slower phones), which would leave the loading cover up forever.
  // Mounting the iframe client-side guarantees the listener, and the timeout is a backstop.
  useEffect(() => {
    setMounted(true);
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 8000);
    return () => window.clearTimeout(timer);
  }, [embedUrl]);

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

  const iframe = mounted ? (
    <iframe
      key={embedUrl}
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
  ) : null;

  const viewer = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-slate-900",
        fill && "h-full sm:h-auto",
        className
      )}
    >
      {loading && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-900"
          aria-hidden
        >
          <Loader2 className="h-8 w-8 animate-spin text-slate-500 motion-reduce:animate-none" />
        </div>
      )}

      {aspectRatio ? (
        <div
          className={cn(
            "relative w-full sm:aspect-video sm:h-auto sm:max-h-none",
            fill ? "h-full" : "aspect-3/4 max-h-[75dvh]"
          )}
        >
          {iframe}
        </div>
      ) : (
        <div style={{ height }}>{iframe}</div>
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
        <DialogContent className="flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[95vh] sm:w-full sm:max-w-6xl sm:rounded-lg sm:border">
          <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
            <DialogTitle className="truncate">{title}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 sm:flex-none sm:p-4">
            <MatterportViewer
              url={url}
              title={title}
              aspectRatio
              showToolbar={false}
              fill
              className="rounded-none sm:rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
