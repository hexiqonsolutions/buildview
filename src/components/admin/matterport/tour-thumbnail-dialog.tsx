"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { updateTourThumbnail } from "@/lib/actions/admin";
import { getMatterportThumbnailUrl } from "@/lib/matterport";
import {
  uploadProjectCoverFile,
  validateProjectCoverFile,
} from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ThumbnailDraft =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File }
  | { kind: "none" };

interface TourThumbnailDialogProps {
  tour: {
    id: string;
    name: string;
    project_id: string;
    matterport_url: string;
    thumbnail_url: string | null;
  } | null;
  onOpenChange: (open: boolean) => void;
}

function initialDraft(thumbnailUrl: string | null | undefined): ThumbnailDraft {
  return thumbnailUrl ? { kind: "url", url: thumbnailUrl } : { kind: "none" };
}

export function TourThumbnailDialog({ tour, onOpenChange }: TourThumbnailDialogProps) {
  const [draft, setDraft] = useState<ThumbnailDraft>(initialDraft(tour?.thumbnail_url));
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matterportThumb = tour ? getMatterportThumbnailUrl(tour.matterport_url) : null;

  useEffect(() => {
    setDraft(initialDraft(tour?.thumbnail_url));
    setError(null);
  }, [tour]);

  useEffect(() => {
    if (draft.kind !== "file") {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);

  const previewSrc = draft.kind === "url" ? draft.url : draft.kind === "file" ? filePreview : null;
  const unchanged =
    (draft.kind === "none" && !tour?.thumbnail_url) ||
    (draft.kind === "url" && draft.url === tour?.thumbnail_url);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const validationError = validateProjectCoverFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setDraft({ kind: "file", file });
  }

  async function handleSave() {
    if (!tour) return;
    setSaving(true);
    setError(null);
    try {
      let nextUrl: string | null = null;
      if (draft.kind === "file") {
        const upload = await uploadProjectCoverFile(tour.project_id, draft.file);
        nextUrl = upload.publicUrl;
      } else if (draft.kind === "url") {
        nextUrl = draft.url;
      }
      await updateTourThumbnail(tour.id, nextUrl);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update thumbnail");
    }
    setSaving(false);
  }

  return (
    <Dialog open={tour !== null} onOpenChange={(open) => !saving && onOpenChange(open)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tour thumbnail</DialogTitle>
          <DialogDescription>
            {tour?.name} — shown on tour cards in the admin panel and the client portal.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={`${tour?.name ?? "Tour"} thumbnail preview`}
              className="h-full w-full object-cover"
              onError={() =>
                setError(
                  "This image couldn't load. If it's the Matterport snapshot, make sure the space is Public or Unlisted."
                )
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Camera className="h-10 w-10" />
              <span className="text-xs">No thumbnail</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Upload image
          </Button>
          {matterportThumb && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || (draft.kind === "url" && draft.url === matterportThumb)}
              onClick={() => {
                setError(null);
                setDraft({ kind: "url", url: matterportThumb });
              }}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Use Matterport snapshot
            </Button>
          )}
          {draft.kind !== "none" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              disabled={saving}
              onClick={() => {
                setError(null);
                setDraft({ kind: "none" });
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">JPEG, PNG, WebP, or GIF up to 5 MB.</p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <Button
            type="button"
            className="ops-btn-primary flex-1"
            disabled={saving || unchanged}
            onClick={handleSave}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save thumbnail
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
