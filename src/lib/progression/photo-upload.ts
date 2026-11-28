"use client";

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createStepPhotoUpload, saveStepPhoto } from "@/lib/actions/checklist";
import { STORAGE_BUCKETS } from "@/lib/types";

/** Shrink a phone photo to ≤1600 px (JPEG ~0.75) before upload. */
export async function compressImage(file: File, maxSide = 1600): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read the photo."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the photo."))), "image/jpeg", 0.75)
    );
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload a step photo (retries twice on network errors). */
export async function uploadStepPhoto(projectId: string, stepId: string, kind: "start" | "end" | "other", file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo.");
  const { blob, width, height } = await compressImage(file);
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ticket = await createStepPhotoUpload({ projectId, stepId, kind });
      if (!ticket.ok) throw new Error(ticket.error);
      const { error } = await createBrowserClient()
        .storage.from(STORAGE_BUCKETS.PROJECT_MEDIA)
        .uploadToSignedUrl(ticket.data.path, ticket.data.token, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const saved = await saveStepPhoto({ projectId, stepId, kind, path: ticket.data.path, width, height });
      if (!saved.ok) throw new Error(saved.error);
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Photo upload failed.");
}
