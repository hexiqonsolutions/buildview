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
      <div className="portal-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border border-slate-200 dark:border-slate-700">
            <AvatarImage src={previewUrl || undefined} alt={user.full_name} />
            <AvatarFallback className="bg-slate-900 text-lg font-semibold text-white">
              {initials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Profile photo
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Shown in the header and anywhere your name appears. Crop to a circle before
              saving — JPEG, PNG, WebP, or GIF, max 5 MB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              className="text-slate-500"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>

        {(error || success) && (
          <div className="w-full sm:basis-full">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            )}
          </div>
        )}
      </div>

      <ProfileAvatarCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={handleCropDialogChange}
        onCropped={handleCropped}
      />
    </>
  );
}
