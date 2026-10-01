"use client";

import { useEffect, useState } from "react";
import { Loader2, X, ZoomIn } from "lucide-react";
import { getIssueImageSignedUrl } from "@/lib/actions/issues";
import type { IssueImage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface IssueImageGalleryProps {
  images: IssueImage[];
  compact?: boolean;
  /** When provided, each thumbnail shows a remove button. */
  onRemove?: (imageId: string) => Promise<void>;
}

export function IssueImageGallery({ images, compact = false, onRemove }: IssueImageGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(imageId: string) {
    if (!onRemove) return;
    setRemovingId(imageId);
    try {
      await onRemove(imageId);
    } finally {
      setRemovingId(null);
    }
  }

  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const imageKey = sortedImages.map((image) => image.id).join(",");

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      setLoading(true);
      const next: Record<string, string> = {};

      await Promise.all(
        sortedImages.map(async (image) => {
          try {
            const { url } = await getIssueImageSignedUrl(image.id);
            next[image.id] = url;
          } catch {
            if (image.image_url.startsWith("http")) {
              next[image.id] = image.image_url;
            }
          }
        })
      );

      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      }
    }

    if (sortedImages.length > 0) {
      loadUrls();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the set of photos changes
  }, [imageKey]);

  if (sortedImages.length === 0) return null;

  const thumbClass = compact
    ? "h-16 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
    : "h-24 w-32 rounded-lg object-cover ring-1 ring-slate-200 transition-transform group-hover:scale-105 dark:ring-slate-700";

  const lightboxImage = sortedImages.find((img) => img.id === lightboxId);

  return (
    <>
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading photos...
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedImages.map((image) => {
              const url = urls[image.id];
              if (!url) return null;

              return (
                <div key={image.id} className="relative shrink-0">
                  <button
                    type="button"
                    className="group relative text-left"
                    onClick={() => setLightboxId(image.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={image.caption || "Issue photo"}
                      className={thumbClass}
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </span>
                    {image.caption && (
                      <span className="mt-1 block max-w-32 truncate text-xs text-slate-500">
                        {image.caption}
                      </span>
                    )}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemove(image.id)}
                      disabled={removingId !== null}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingId === image.id ? (
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
            <DialogTitle>{lightboxImage?.caption || "Issue Photo"}</DialogTitle>
          </DialogHeader>
          {lightboxId && urls[lightboxId] && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[lightboxId]}
                alt={lightboxImage?.caption || "Issue photo"}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a href={urls[lightboxId]} target="_blank" rel="noopener noreferrer">
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
