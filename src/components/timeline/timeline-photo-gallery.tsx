"use client";

import { useEffect, useState } from "react";
import { Loader2, X, ZoomIn } from "lucide-react";
import { getTimelinePhotoSignedUrl } from "@/lib/actions/timeline";
import type { TimelinePhoto } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TimelinePhotoGalleryProps {
  photos: TimelinePhoto[];
  compact?: boolean;
  /** When provided, each thumbnail shows a remove button. */
  onRemove?: (photoId: string) => Promise<void>;
}

export function TimelinePhotoGallery({
  photos,
  compact = false,
  onRemove,
}: TimelinePhotoGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const photoKey = sortedPhotos.map((photo) => photo.id).join(",");

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      setLoading(true);
      const next: Record<string, string> = {};

      await Promise.all(
        sortedPhotos.map(async (photo) => {
          if (photo.image_url.startsWith("http")) {
            next[photo.id] = photo.image_url;
            return;
          }
          try {
            const { url } = await getTimelinePhotoSignedUrl(photo.id);
            next[photo.id] = url;
          } catch {
            // Skip photos that cannot be resolved
          }
        })
      );

      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      }
    }

    if (sortedPhotos.length > 0) {
      loadUrls();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the set of photos changes
  }, [photoKey]);

  async function handleRemove(photoId: string) {
    if (!onRemove) return;
    setRemovingId(photoId);
    try {
      await onRemove(photoId);
    } finally {
      setRemovingId(null);
    }
  }

  if (sortedPhotos.length === 0) return null;

  const thumbClass = compact
    ? "h-16 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
    : "h-24 w-32 rounded-lg object-cover ring-1 ring-slate-200 transition-transform group-hover:scale-105 dark:ring-slate-700";

  const lightboxPhoto = sortedPhotos.find((photo) => photo.id === lightboxId);

  return (
    <>
      <div className={compact ? "mt-2" : "mt-4"}>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading photos...
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedPhotos.map((photo) => {
              const url = urls[photo.id];
              if (!url) return null;

              return (
                <div key={photo.id} className="relative shrink-0">
                  <button
                    type="button"
                    className="group relative text-left"
                    onClick={() => setLightboxId(photo.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={photo.caption || "Timeline photo"}
                      className={thumbClass}
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow-sm" />
                    </span>
                    {photo.caption && (
                      <span className="mt-1 block max-w-32 truncate text-xs text-slate-500">
                        {photo.caption}
                      </span>
                    )}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemove(photo.id)}
                      disabled={removingId !== null}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingId === photo.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(lightboxId)} onOpenChange={() => setLightboxId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{lightboxPhoto?.caption || "Timeline Photo"}</DialogTitle>
          </DialogHeader>
          {lightboxId && urls[lightboxId] && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[lightboxId]}
                alt={lightboxPhoto?.caption || "Timeline photo"}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={urls[lightboxId]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open full size
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
