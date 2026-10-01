"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Film,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildStoragePath, uploadFileToStorage } from "@/lib/supabase/storage";
import {
  addProjectMedia,
  deleteProjectMedia,
  moveProjectMedia,
  renameProjectMedia,
} from "@/lib/actions/project-media";
import {
  PROJECT_MEDIA_ACCEPT,
  isGifMedia,
  projectMediaFormatLabel,
  titleFromFileName,
  validateProjectMediaFile,
  type ProjectMediaGroups,
  type ProjectMediaItem,
} from "@/lib/project-media";
import { STORAGE_BUCKETS, type ProjectMediaType } from "@/lib/types";

function MediaTile({
  item,
  isFirst,
  isLast,
  onChanged,
  onRemoved,
}: {
  item: ProjectMediaItem;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
  onRemoved: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const saveTitle = () =>
    run(async () => {
      await renameProjectMedia(item.id, title);
      setEditing(false);
      onChanged();
    });

  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        {item.url ? (
          item.media_type === "video" && !isGifMedia(item) ? (
            <video
              src={`${item.url}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          )
        ) : null}
        {item.media_type === "video" && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {projectMediaFormatLabel(item)}
          </span>
        )}
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-950/60">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(item.title);
                setEditing(false);
              }
            }}
            maxLength={200}
            autoFocus
            aria-label="Media title"
            className="h-8 text-sm"
          />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveTitle} aria-label="Save title">
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setTitle(item.title);
              setEditing(false);
            }}
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300" title={item.title}>
            {item.title}
          </p>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)} aria-label="Rename" disabled={isPending}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => run(async () => { await moveProjectMedia(item.id, "up"); onChanged(); })}
            aria-label="Move earlier"
            disabled={isPending || isFirst}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => run(async () => { await moveProjectMedia(item.id, "down"); onChanged(); })}
            aria-label="Move later"
            disabled={isPending || isLast}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-red-600 hover:text-red-700"
            onClick={() => {
              if (!window.confirm(`Delete "${item.title}"? Clients will no longer see it.`)) return;
              run(async () => {
                await deleteProjectMedia(item.id);
                onRemoved(item.id);
              });
            }}
            aria-label="Delete"
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function MediaSection({
  projectId,
  type,
  items,
  onAdded,
  onChanged,
  onRemoved,
}: {
  projectId: string;
  type: ProjectMediaType;
  items: ProjectMediaItem[];
  onAdded: (item: ProjectMediaItem) => void;
  onChanged: () => void;
  onRemoved: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const isVideo = type === "video";
  const Icon = isVideo ? Film : ImageIcon;

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    const nextErrors: string[] = [];
    let added = 0;
    for (const [index, file] of files.entries()) {
      const invalid = validateProjectMediaFile(file, type);
      if (invalid) {
        nextErrors.push(invalid);
        continue;
      }
      setProgress(
        files.length > 1 ? `Uploading ${index + 1} of ${files.length}…` : `Uploading ${file.name}…`
      );
      try {
        const upload = await uploadFileToStorage(
          STORAGE_BUCKETS.PROJECT_MEDIA,
          buildStoragePath(projectId, file.name),
          file
        );
        const item = await addProjectMedia({
          project_id: projectId,
          media_type: type,
          title: titleFromFileName(file.name),
          storage_path: upload.path,
          file_name: upload.fileName,
          mime_type: upload.mimeType,
          file_size: upload.fileSize,
        });
        onAdded(item);
        added += 1;
      } catch (err) {
        nextErrors.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setProgress(null);
    setErrors(nextErrors);
    if (added > 0) onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon className="h-4 w-4 text-slate-500" />
          {isVideo ? "Videos" : "Photos"}
          <span className="font-normal text-slate-400">({items.length})</span>
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept={PROJECT_MEDIA_ACCEPT[type]}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={Boolean(progress)}
          onClick={() => inputRef.current?.click()}
        >
          {progress ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isVideo ? "Add videos" : "Add photos"}
        </Button>
      </div>

      {progress && <p className="text-xs text-slate-500">{progress}</p>}
      {errors.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-xs text-red-600">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
          {isVideo
            ? "No videos yet. Add MP4, WebM, MOV, or GIF files (up to 200 MB each)."
            : "No photos yet. Add JPEG, PNG, or WebP images (up to 20 MB each)."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <MediaTile
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onChanged={onChanged}
              onRemoved={onRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin: manage the Videos & Photos shown on a portfolio showcase project. */
export function ProjectMediaManager({
  projectId,
  initialMedia,
}: {
  projectId: string;
  initialMedia: ProjectMediaGroups;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialMedia.videos);
  const [photos, setPhotos] = useState(initialMedia.photos);
  const [syncedFrom, setSyncedFrom] = useState(initialMedia);

  if (syncedFrom !== initialMedia) {
    setSyncedFrom(initialMedia);
    setVideos(initialMedia.videos);
    setPhotos(initialMedia.photos);
  }

  const refresh = () => router.refresh();
  const remove = (id: string) => {
    setVideos((current) => current.filter((item) => item.id !== id));
    setPhotos((current) => current.filter((item) => item.id !== id));
    refresh();
  };

  return (
    <section className="ops-card space-y-6 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Portfolio videos &amp; photos
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Shown below the virtual walkthrough on the client&apos;s portfolio showcase, in this order.
        </p>
      </div>
      <MediaSection
        projectId={projectId}
        type="video"
        items={videos}
        onAdded={(item) => setVideos((current) => [...current, item])}
        onChanged={refresh}
        onRemoved={remove}
      />
      <MediaSection
        projectId={projectId}
        type="photo"
        items={photos}
        onAdded={(item) => setPhotos((current) => [...current, item])}
        onChanged={refresh}
        onRemoved={remove}
      />
    </section>
  );
}
