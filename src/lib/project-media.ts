import type { ProjectMedia, ProjectMediaType } from "@/lib/types";
import { LIMITS } from "@/lib/validations/primitives";

export type ProjectMediaItem = ProjectMedia & { url: string | null };

export type ProjectMediaGroups = {
  videos: ProjectMediaItem[];
  photos: ProjectMediaItem[];
};

/** Must stay in sync with the project-media bucket in migration 027. */
export const PROJECT_MEDIA_MIME_TYPES: Record<ProjectMediaType, readonly string[]> = {
  video: ["video/mp4", "video/webm", "video/quicktime", "image/gif"],
  photo: ["image/jpeg", "image/png", "image/webp"],
};

export const PROJECT_MEDIA_ACCEPT: Record<ProjectMediaType, string> = {
  video: ".mp4,.webm,.mov,.gif,video/mp4,video/webm,video/quicktime,image/gif",
  photo: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
};

export const PROJECT_MEDIA_MAX_BYTES: Record<ProjectMediaType, number> = {
  video: 200 * 1024 * 1024,
  photo: 20 * 1024 * 1024,
};

/** Badge shown on video cards, e.g. "MP4" or "GIF". */
export function projectMediaFormatLabel(item: Pick<ProjectMedia, "mime_type" | "file_name">): string {
  if (item.mime_type === "image/gif") return "GIF";
  if (item.mime_type === "video/quicktime") return "MOV";
  if (item.mime_type === "video/webm") return "WEBM";
  if (item.mime_type === "video/mp4") return "MP4";
  return item.file_name.split(".").pop()?.toUpperCase() ?? "VIDEO";
}

export function isGifMedia(item: Pick<ProjectMedia, "mime_type">): boolean {
  return item.mime_type === "image/gif";
}

export function validateProjectMediaFile(file: File, type: ProjectMediaType): string | null {
  if (!PROJECT_MEDIA_MIME_TYPES[type].includes(file.type)) {
    return type === "video"
      ? `${file.name}: videos must be MP4, WebM, MOV, or GIF.`
      : `${file.name}: photos must be JPEG, PNG, or WebP.`;
  }
  const max = PROJECT_MEDIA_MAX_BYTES[type];
  if (file.size > max) {
    return `${file.name}: must be ${Math.round(max / 1024 / 1024)} MB or smaller.`;
  }
  return null;
}

/** "LONG INTRO - 480p.mp4" → "LONG INTRO - 480p" */
export function titleFromFileName(name: string): string {
  const title = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || name;
  return title.slice(0, LIMITS.title).trim();
}
