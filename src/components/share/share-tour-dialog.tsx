"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createTourShare,
  getActiveTourShare,
  revokeTourShare,
  type TourShareSummary,
} from "@/lib/actions/tour-shares";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ShareTourDialogProps = {
  tourId: string;
  tourName?: string;
  trigger?: ReactNode;
  /** Compact trigger for toolbars */
  size?: "default" | "sm" | "icon";
};

export function ShareTourDialog({
  tourId,
  tourName,
  trigger,
  size = "sm",
}: ShareTourDialogProps) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<TourShareSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const loadOrCreate = useCallback(() => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const existing = await getActiveTourShare(tourId);
      if (!existing.ok) {
        setError(existing.error);
        setLoading(false);
        return;
      }
      if (existing.share) {
        setShare(existing.share);
        setLoading(false);
        return;
      }
      const created = await createTourShare(tourId);
      if (!created.ok) {
        setError(created.error);
        setLoading(false);
        return;
      }
      setShare(created.share);
      setLoading(false);
    });
  }, [tourId]);

  useEffect(() => {
    if (!open) return;
    loadOrCreate();
  }, [open, loadOrCreate]);

  async function handleCopy() {
    if (!share?.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link and copy manually.");
    }
  }

  async function handleNativeShare() {
    if (!share?.url || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: tourName ? `${tourName} — BuildView tour` : "BuildView site tour",
        text: "View this 360° construction site tour",
        url: share.url,
      });
    } catch {
      /* user cancelled */
    }
  }

  function handleWhatsApp() {
    if (!share?.url) return;
    const text = encodeURIComponent(
      `View this BuildView site tour${tourName ? ` (${tourName})` : ""}: ${share.url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const created = await createTourShare(tourId);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setShare(created.share);
    });
  }

  function handleRevoke() {
    if (!share) return;
    startTransition(async () => {
      const result = await revokeTourShare(share.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShare(null);
    });
  }

  const defaultTrigger = (
    <Button variant="outline" size={size === "icon" ? "icon" : size}>
      <Share2 className={cn("h-4 w-4", size !== "icon" && "mr-1.5")} />
      {size !== "icon" && "Share"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share tour link</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this scan for 10 days — no login required. You can
            revoke it anytime.
          </DialogDescription>
        </DialogHeader>

        {loading || (pending && !share) ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Preparing link…
          </div>
        ) : share ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={share.url}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  onFocus={(e) => e.target.select()}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Expires {formatDate(share.expiresAt)}
                {share.viewCount > 0 ? ` · ${share.viewCount} view${share.viewCount === 1 ? "" : "s"}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Link2 className="mr-1.5 h-4 w-4" /> Copy link
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleWhatsApp}>
                WhatsApp
              </Button>
              {canNativeShare && (
                <Button type="button" variant="outline" size="sm" onClick={handleNativeShare}>
                  <Share2 className="mr-1.5 h-4 w-4" /> Share…
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleRevoke}
                disabled={pending}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Revoke link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-slate-500">
              No active share link. Create one to copy a 10-day public URL.
            </p>
            <Button type="button" onClick={handleCreate} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Link2 className="mr-1.5 h-4 w-4" /> Create share link
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
