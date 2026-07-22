"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ImageIcon, Loader2, ZoomIn } from "lucide-react";
import { getTimelinePhotoSignedUrl } from "@/lib/actions/timeline";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { matchesSpatialScope } from "@/lib/admin/scope";
import type { AdminSitePhoto } from "@/lib/actions/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface SitePhotosGalleryProps {
  photos: AdminSitePhoto[];
}

export function SitePhotosGallery({ photos }: SitePhotosGalleryProps) {
  const { hydrated, scope, clientProjects, project } = useAdminWorkspace();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const scopedProjectIds = useMemo(() => {
    if (scope.projectId) return new Set([scope.projectId]);
    if (scope.clientId) return new Set(clientProjects.map((p) => p.id));
    return new Set(photos.map((p) => p.project_id));
  }, [scope, clientProjects, photos]);

  const filtered = useMemo(() => {
    return photos.filter((photo) =>
      matchesSpatialScope(photo, scope, scopedProjectIds)
    );
  }, [photos, scope, scopedProjectIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      setLoading(true);
      const next: Record<string, string> = {};

      await Promise.all(
        filtered.map(async (photo) => {
          try {
            const { url } = await getTimelinePhotoSignedUrl(photo.id);
            next[photo.id] = url;
          } catch {
            if (photo.image_url.startsWith("http")) {
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

    if (filtered.length > 0) {
      loadUrls();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [filtered]);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  const lightboxPhoto = filtered.find((p) => p.id === lightboxId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} photo{filtered.length === 1 ? "" : "s"}
          {project ? ` · ${project.name}` : scope.clientId ? " in workspace" : ""}
        </p>
        {filtered.length > 0 && (
          <Button asChild size="sm" className="ops-btn-primary h-9">
            <Link href="/admin/upload?type=site_photos">Upload Photos</Link>
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="ops-card flex min-h-[280px] flex-col items-center justify-center p-10 text-center">
          <ImageIcon className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-900 dark:text-white">No site photos yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Photos are linked to timeline events. Upload from the Upload Center.
          </p>
          <Button asChild className="mt-4 ops-btn-primary" size="sm">
            <Link href="/admin/upload?type=site_photos">Upload Photos</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading gallery…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((photo) => {
            const url = urls[photo.id];
            if (!url) return null;

            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxId(photo.id)}
                className="group ops-card overflow-hidden text-left transition-all hover:shadow-lg"
              >
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={photo.caption || photo.event_title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
                    {photo.caption || photo.event_title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(photo.event_date)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">
                    {photo.project_name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(lightboxId)} onOpenChange={() => setLightboxId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {lightboxPhoto?.caption || lightboxPhoto?.event_title || "Site Photo"}
            </DialogTitle>
          </DialogHeader>
          {lightboxId && urls[lightboxId] && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[lightboxId]}
                alt={lightboxPhoto?.caption || "Site photo"}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                <span>
                  {lightboxPhoto?.project_name} · {formatDate(lightboxPhoto?.event_date ?? "")}
                </span>
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
    </div>
  );
}
