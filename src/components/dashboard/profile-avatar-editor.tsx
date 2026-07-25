"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  removeAvatarUrl,
  updateAvatarUrl,
} from "@/lib/actions/profile";
import {
  uploadAvatarFile,
  validateAvatarFile,
} from "@/lib/supabase/storage";
import { revokeObjectUrl } from "@/lib/avatar-crop";
import { ProfileAvatarCropDialog } from "@/components/dashboard/profile-avatar-crop-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/types";

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileAvatarEditor({ user }: { user: User }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatar_url);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreviewUrl(user.avatar_url);
  }, [user.avatar_url]);

  useEffect(() => {
    return () => revokeObjectUrl(cropSrc);
  }, [cropSrc]);

  function handlePick() {
    setError(null);
    setSuccess(null);
    inputRef.current?.click();
  }

  function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    revokeObjectUrl(cropSrc);
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
    setError(null);
    setSuccess(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleCropDialogChange(open: boolean) {
    setCropOpen(open);
    if (!open) {
      revokeObjectUrl(cropSrc);
      setCropSrc(null);
    }
  }

  function handleCropped(file: File) {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      try {
        const upload = await uploadAvatarFile(user.id, file);
        const result = await updateAvatarUrl(upload.publicUrl);
        if (result.error) {
          setError(result.error);
          return;
        }
        setPreviewUrl(upload.publicUrl);
        setSuccess("Profile photo updated.");
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        const bucketMissing = /bucket not found/i.test(msg);
        setError(
          bucketMissing
            ? "Photo storage is not set up yet. Ask your admin to run supabase/FIX_avatars_bucket.sql in Supabase."
            : msg
        );
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const result = await removeAvatarUrl();
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreviewUrl(null);
      setSuccess("Profile photo removed.");
      router.refresh();
    });
  }

  return (
    <>
      <section className="portal-card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Profile photo
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Used in the header and across BuildView. Max 5 MB.
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 px-6 py-6 sm:flex-row sm:items-center sm:gap-6">
          <button
            type="button"
            onClick={handlePick}
            disabled={isPending}
            className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            aria-label={previewUrl ? "Change profile photo" : "Upload profile photo"}
          >
            <Avatar className="h-24 w-24 ring-1 ring-slate-200 dark:ring-slate-700">
              <AvatarImage src={previewUrl || undefined} alt={user.full_name} />
              <AvatarFallback className="bg-slate-900 text-xl font-semibold text-white">
                {initials(user.full_name, user.email)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {user.full_name || user.email}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Click the photo to upload, then adjust the crop to fit the circle.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePick}
                disabled={isPending}
                className="min-w-[8.5rem]"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {previewUrl ? "Change photo" : "Upload photo"}
              </Button>
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>

            {(error || success) && (
              <p
                className={`mt-3 text-sm ${
                  error
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {error || success}
              </p>
            )}
          </div>
        </div>
      </section>

      <ProfileAvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={handleCropDialogChange}
        onCropped={handleCropped}
      />
    </>
  );
}
