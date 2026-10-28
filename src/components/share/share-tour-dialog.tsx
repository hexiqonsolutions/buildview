"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  Trash2,
  Users,
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
  getTourShareViewers,
  revokeTourShare,
  type TourShareSummary,
  type TourShareViewerRow,
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
  const [viewers, setViewers] = useState<TourShareViewerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const refreshViewers = useCallback(async () => {
    const result = await getTourShareViewers(tourId);
    if (result.ok) setViewers(result.viewers);
  }, [tourId]);

  const loadOrCreate = useCallback(() => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const viewersResult = await getTourShareViewers(tourId);
      if (viewersResult.ok) setViewers(viewersResult.viewers);

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
      setViewers([]);
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
      setViewers([]);
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

            <ViewersPanel viewers={viewers} onRefresh={refreshViewers} />
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
            <ViewersPanel viewers={viewers} onRefresh={refreshViewers} />
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

function viewersToCsv(viewers: TourShareViewerRow[]): string {
  const header = "Name,Phone,Email,Opened at";
  const rows = viewers.map((v) =>
    [v.viewerName, v.viewerPhone ?? "", v.viewerEmail ?? "", v.createdAt]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

function ViewersPanel({
  viewers,
  onRefresh,
}: {
  viewers: TourShareViewerRow[];
  onRefresh: () => void | Promise<void>;
}) {
  const [copiedCsv, setCopiedCsv] = useState(false);

  async function copyCsv() {
    try {
      await navigator.clipboard.writeText(viewersToCsv(viewers));
      setCopiedCsv(true);
      window.setTimeout(() => setCopiedCsv(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Users className="h-4 w-4 text-slate-500" />
            Viewer details ({viewers.length})
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Name, phone, and email collected when someone opens the share link.
          </p>
        </div>
        <div className="flex gap-1">
          {viewers.length > 0 && (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={copyCsv}>
              {copiedCsv ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy CSV
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => void onRefresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {viewers.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
          No viewer details yet. When someone opens the link and enters their name, phone, and
          email, they will show up here.
        </p>
      ) : (
        <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Opened</th>
              </tr>
            </thead>
            <tbody>
              {viewers.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 bg-white">
                  <td className="px-3 py-2 font-medium text-slate-900">{v.viewerName}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {v.viewerPhone ? (
                      <a href={`tel:${v.viewerPhone.replace(/\s/g, "")}`} className="hover:underline">
                        {v.viewerPhone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {v.viewerEmail ? (
                      <a href={`mailto:${v.viewerEmail}`} className="hover:underline">
                        {v.viewerEmail}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {formatDate(v.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
