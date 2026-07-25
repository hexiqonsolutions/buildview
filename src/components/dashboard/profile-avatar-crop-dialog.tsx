"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Minus, Plus } from "lucide-react";
import { getCroppedAvatarBlob } from "@/lib/avatar-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProfileAvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => void;
}

export function ProfileAvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onCropped,
}: ProfileAvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleOpenChange(next: boolean) {
    if (busy) return;
    onOpenChange(next);
  }

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Adjust the crop first, then save.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onCropped(file);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open && Boolean(imageSrc)} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "!flex max-h-[92vh] w-[min(100vw-1.5rem,420px)] max-w-[420px] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-slate-100 px-5 py-4 pr-12 text-left dark:border-slate-800">
          <DialogTitle className="text-base">Adjust photo</DialogTitle>
          <DialogDescription className="text-sm">
            Drag to move. Use zoom so your face fits inside the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(58vw,300px)] w-full shrink-0 bg-slate-950">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="horizontal-cover"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="shrink-0 space-y-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Zoom out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
              disabled={zoom <= 1 || busy}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900 dark:bg-slate-700 dark:accent-white"
              aria-label="Zoom"
            />
            <button
              type="button"
              aria-label="Zoom in"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              disabled={zoom >= 3 || busy}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {error && (
            <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save photo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
