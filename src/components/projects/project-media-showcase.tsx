"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProjectMediaDownloadUrl } from "@/lib/actions/project-media";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isGifMedia,
  projectMediaFormatLabel,
  type ProjectMediaGroups,
  type ProjectMediaItem,
} from "@/lib/project-media";

function DownloadMediaButton({ item }: { item: ProjectMediaItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const url = await getProjectMediaDownloadUrl(item.id);
              const link = document.createElement("a");
              link.href = url;
              link.rel = "noopener";
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Download failed");
            }
          });
        }}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-4 w-4" />
        )}
        Download
      </Button>
    </div>
  );
}

function VideoThumbnail({ item }: { item: ProjectMediaItem }) {
  if (!item.url) return null;
  if (isGifMedia(item)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" className="h-full w-full object-cover" />;
  }
  return (
    <video
      // The time fragment makes mobile browsers paint the first frame as a poster.
      src={`${item.url}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      tabIndex={-1}
      aria-hidden
      className="pointer-events-none h-full w-full object-cover"
    />
  );
}

function VideosGrid({ videos }: { videos: ProjectMediaItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = videos.find((video) => video.id === activeId) ?? null;

  return (
    <section aria-labelledby="project-videos-heading" className="space-y-4">
      <h2
        id="project-videos-heading"
        className="font-display text-lg font-semibold text-slate-900 dark:text-white md:text-xl"
      >
        Videos
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setActiveId(video.id)}
            aria-label={`Play ${video.title}`}
            className="group cursor-pointer text-left focus-visible:outline-none"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-shadow duration-200 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-slate-900 group-focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:group-focus-visible:ring-white">
              <VideoThumbnail item={video} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/15">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform duration-200 group-hover:scale-105">
                  <Play className="ml-0.5 h-5 w-5 fill-slate-900 text-slate-900" />
                </span>
              </span>
              <span className="absolute bottom-2 left-2 rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                {projectMediaFormatLabel(video)}
              </span>
            </div>
            <p className="mt-2.5 truncate text-sm text-slate-700 dark:text-slate-300">
              {video.title}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActiveId(null)}>
        <DialogContent className="max-w-4xl gap-3 p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle className="pr-8 text-base">{active?.title}</DialogTitle>
          </DialogHeader>
          {active?.url ? (
            isGifMedia(active) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt={active.title}
                className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
              />
            ) : (
              <video
                key={active.id}
                src={active.url}
                controls
                autoPlay
                playsInline
                className="max-h-[75vh] w-full rounded-lg bg-black"
              />
            )
          ) : null}
          {active ? <DownloadMediaButton key={active.id} item={active} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PhotosGrid({ photos }: { photos: ProjectMediaItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const active = index === null ? null : photos[index];

  const step = useCallback(
    (delta: number) =>
      setIndex((current) =>
        current === null ? current : (current + delta + photos.length) % photos.length
      ),
    [photos.length]
  );

  useEffect(() => {
    if (index === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, step]);

  return (
    <section aria-labelledby="project-photos-heading" className="space-y-4">
      <h2
        id="project-photos-heading"
        className="font-display text-lg font-semibold text-slate-900 dark:text-white md:text-xl"
      >
        Photos
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
        {photos.map((photo, photoIndex) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setIndex(photoIndex)}
            aria-label={`View photo: ${photo.title}`}
            className="group cursor-pointer text-left focus-visible:outline-none"
          >
            <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-shadow duration-200 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-slate-900 group-focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:group-focus-visible:ring-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url ?? undefined}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <p className="mt-2 truncate text-sm text-slate-700 dark:text-slate-300">
              {photo.title}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent className="max-w-5xl gap-3 p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle className="pr-8 text-base">
              {active?.title}
              {photos.length > 1 && index !== null ? (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {index + 1} / {photos.length}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          {active?.url ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.title}
                className="mx-auto max-h-[75vh] w-auto rounded-lg object-contain"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="overlay"
                    size="icon"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="overlay"
                    size="icon"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          ) : null}
          {active ? <DownloadMediaButton key={active.id} item={active} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Portfolio showcase: Videos and Photos below the virtual walkthrough. */
export function ProjectMediaShowcase({ media }: { media: ProjectMediaGroups }) {
  const videos = media.videos.filter((item) => item.url);
  const photos = media.photos.filter((item) => item.url);
  if (videos.length === 0 && photos.length === 0) return null;

  return (
    <div className="space-y-10">
      {videos.length > 0 && <VideosGrid videos={videos} />}
      {photos.length > 0 && <PhotosGrid photos={photos} />}
    </div>
  );
}
