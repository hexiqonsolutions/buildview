"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMatterportEmbedUrl, isValidMatterportUrl } from "@/lib/matterport";

interface SyncedViewerPairProps {
  leftUrl: string;
  rightUrl: string;
  leftTitle: string;
  rightTitle: string;
  syncEnabled: boolean;
  onSyncChange?: (synced: boolean) => void;
  fullscreen?: boolean;
  /** Tall immersive viewers for the comparison hub (default aspect-video). */
  immersive?: boolean;
}

function ViewerPane({
  url,
  title,
  iframeRef,
  onMessage,
  tall,
  immersive,
}: {
  url: string;
  title: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onMessage?: (data: unknown) => void;
  tall?: boolean;
  immersive?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const valid = isValidMatterportUrl(url);
  const embedUrl = getMatterportEmbedUrl(url);

  useEffect(() => {
    function handler(event: MessageEvent) {
      if (event.source === iframeRef.current?.contentWindow) {
        onMessage?.(event.data);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [iframeRef, onMessage]);

  if (!valid) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-900 text-sm text-slate-400">
        Invalid tour URL
      </div>
    );
  }

  return (
    <div className="relative bg-slate-900">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        </div>
      )}
      <div
        className={cn(
          "relative w-full",
          tall || immersive ? "h-[min(72vh,820px)] min-h-[420px]" : "aspect-video"
        )}
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title}
          allowFullScreen
          allow="fullscreen; xr-spatial-tracking"
          onLoad={() => setLoading(false)}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}

export function SyncedViewerPair({
  leftUrl,
  rightUrl,
  leftTitle,
  rightTitle,
  syncEnabled,
  fullscreen = false,
  immersive = false,
}: SyncedViewerPairProps) {
  const leftRef = useRef<HTMLIFrameElement>(null);
  const rightRef = useRef<HTMLIFrameElement>(null);
  const relayLock = useRef(false);

  const relayToOther = useCallback(
    (source: "left" | "right", data: unknown) => {
      if (!syncEnabled || relayLock.current) return;
      const target = source === "left" ? rightRef : leftRef;
      try {
        relayLock.current = true;
        target.current?.contentWindow?.postMessage(data, "*");
      } finally {
        setTimeout(() => {
          relayLock.current = false;
        }, 50);
      }
    },
    [syncEnabled]
  );

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-800">
      <ViewerPane
        url={leftUrl}
        title={leftTitle}
        iframeRef={leftRef}
        onMessage={(data) => relayToOther("left", data)}
        tall={fullscreen}
        immersive={immersive}
      />
      <ViewerPane
        url={rightUrl}
        title={rightTitle}
        iframeRef={rightRef}
        onMessage={(data) => relayToOther("right", data)}
        tall={fullscreen}
        immersive={immersive}
      />
    </div>
  );
}

export function SyncStatusBadge({
  syncEnabled,
  sameModel,
  theme = "dark",
}: {
  syncEnabled: boolean;
  sameModel: boolean;
  theme?: "dark" | "light";
}) {
  const independentClass =
    theme === "light"
      ? "inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600"
      : "compare-sync-badge-independent";
  const syncedClass =
    theme === "light"
      ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
      : "compare-sync-badge-synced";

  if (!syncEnabled) {
    return (
      <span className={independentClass}>
        <Unlink className="h-3 w-3" />
        Independent
      </span>
    );
  }
  if (sameModel) {
    return (
      <span className={syncedClass}>
        <Link2 className="h-3 w-3" />
        Synced
      </span>
    );
  }
  return (
    <span className={independentClass}>
      <Unlink className="h-3 w-3" />
      Independent — different models
    </span>
  );
}

export function ViewerFullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" className="h-8 bg-white/90" onClick={onClick}>
      <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
      Fullscreen
    </Button>
  );
}
