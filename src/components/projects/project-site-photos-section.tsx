"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ImageIcon, Loader2, ZoomIn } from "lucide-react";
import { getTimelinePhotoSignedUrl } from "@/lib/actions/timeline";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { TimelineEventWithRelations, TimelinePhoto } from "@/lib/types";

export type ProjectSitePhoto = TimelinePhoto & {
  event_title: string;
  event_date: string;
  building?: string | null;
  floor?: string | null;
};

export function flattenProjectSitePhotos(
  timeline: TimelineEventWithRelations[]
): ProjectSitePhoto[] {
  return timeline
    .flatMap((event) =>
      (event.timeline_photos ?? [])
        .filter((photo) => !photo.deleted_at)
        .map((photo) => ({
          ...photo,
          event_title: event.title,
          event_date: event.event_date,
          building: event.building,
          floor: event.floor,
        }))
    )
    .sort((a, b) => {
      const byDate = b.event_date.localeCompare(a.event_date);
      if (byDate !== 0) return byDate;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
}

export function ProjectSitePhotosSection({
  timeline,
}: {
  timeline: TimelineEventWithRelations[];
}) {
  const photos = useMemo(() => flattenProjectSitePhotos(timeline), [timeline]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      setLoading(true);
      const next: Record<string, string> = {};

      await Promise.all(
        photos.map(async (photo) => {
          try {
            const { url } = await getTimelinePhotoSignedUrl(photo.id);
            next[photo.id] = url;
          } catch {
            if (photo.image_url?.startsWith("http")) {
              next[photo.id] = photo.image_url;
            }
          }
        })
      );

      if (!cancelled) {
        setUrls(next);
        setLoading(false);
      }
    }

    if (photos.length > 0) {
      loadUrls();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [photos]);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No site images yet"
        description="Site photos uploaded for this project will appear here."
      />
    );
  }

  const lightboxPhoto = photos.find((photo) => photo.id === lightboxId);

  return (
    <>
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading site images…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => {
            const url = urls[photo.id];
            if (!url) return null;

            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxId(photo.id)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={photo.caption || photo.event_title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                    <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {photo.caption || photo.event_title}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatDate(photo.event_date)}
                    {photo.building ? ` · ${photo.building}` : ""}
                    {photo.floor ? ` · ${photo.floor}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(lightboxId)} onOpenChange={() => setLightboxId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {lightboxPhoto?.caption || lightboxPhoto?.event_title || "Site image"}
            </DialogTitle>
          </DialogHeader>
          {lightboxId && urls[lightboxId] ? (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[lightboxId]}
                alt={lightboxPhoto?.caption || "Site image"}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {lightboxPhoto
                    ? `${formatDate(lightboxPhoto.event_date)}${
                        lightboxPhoto.building ? ` · ${lightboxPhoto.building}` : ""
                      }${lightboxPhoto.floor ? ` · ${lightboxPhoto.floor}` : ""}`
                    : null}
                </p>
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
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
