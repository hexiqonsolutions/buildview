"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Camera, Check, Loader2, ScanEye, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MatterportViewerLazy as MatterportViewer } from "@/components/projects/matterport-viewer-lazy";
import type { ProgressionScan, ProgressionStepView } from "@/lib/progression/types";
import { cn, formatDate } from "@/lib/utils";

/**
 * Milestone 3 — evidence and verification for checklist steps.
 * Evidence = the 360 scan that proves a step. Verifiers (BuildView staff and
 * the Client Admin) confirm or reject ended steps, ideally while looking at it.
 */

export type ReviewDecision = "verified" | "rejected";

export function scanDate(scan: ProgressionScan): string {
  return (scan.captureDate ?? scan.createdAt).slice(0, 10);
}

/** Only this floor's scans, newest first: evidence and verification are locked to the floor. */
export function scansForFloor(scans: ProgressionScan[], floorId: string): ProgressionScan[] {
  return scans
    .filter((s) => s.floorId === floorId)
    .sort((a, b) => scanDate(b).localeCompare(scanDate(a)));
}

function scanLabel(scan: ProgressionScan): string {
  return `${scan.name} · ${formatDate(scanDate(scan))}`;
}

/** Day a step was ended (work date, else end time). */
export function stepDoneDate(step: ProgressionStepView): string | null {
  return step.workDate ?? (step.endedAt ?? step.completedAt)?.slice(0, 10) ?? null;
}

// --------------------------------------------------------------- scan viewer

export function ScanViewerDialog({
  scan,
  onOpenChange,
}: {
  scan: ProgressionScan | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={scan !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{scan ? scanLabel(scan) : "Scan"}</DialogTitle>
        </DialogHeader>
        {scan ? <MatterportViewer url={scan.matterportUrl} title={scan.name} /> : null}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------- per-step review strip

/**
 * Shown under an ended step: its evidence scan (or a "Link scan" picker) and
 * its verification state, with Verify / Reject for verifiers.
 */
export function StepReviewStrip({
  step,
  floorId,
  scans,
  canEdit,
  canVerify,
  busy,
  onEvidence,
  onReview,
}: {
  step: ProgressionStepView;
  floorId: string;
  scans: ProgressionScan[];
  canEdit: boolean;
  canVerify: boolean;
  busy: boolean;
  onEvidence: (tourId: string | null, note: string | null) => void;
  onReview: (decision: ReviewDecision, note: string | null, tourId?: string | null) => void;
}) {
  const [viewing, setViewing] = useState<ProgressionScan | null>(null);
  const [picking, setPicking] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const evidence = scans.find((s) => s.id === step.evidenceTourId) ?? null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {evidence ? (
        <button
          type="button"
          onClick={() => setViewing(evidence)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 font-medium text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          title={step.evidenceNote ?? "Open the scan linked as evidence"}
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Evidence: {formatDate(scanDate(evidence))}
        </button>
      ) : canEdit && scans.length > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setPicking(true)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-2.5 font-medium text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300"
        >
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Link scan
        </button>
      ) : null}

      {step.verificationStatus === "verified" ? (
        <span
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-emerald-100 px-2.5 font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
          title={step.verifiedAt ? `Verified ${formatDate(step.verifiedAt)}` : undefined}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Verified{step.verifiedByName ? ` · ${step.verifiedByName}` : ""}
        </span>
      ) : step.verificationStatus === "rejected" ? (
        <span
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-red-100 px-2.5 font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-200"
          title={step.verificationNote ?? undefined}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Rejected{step.verificationNote ? `: ${step.verificationNote}` : ""}
        </span>
      ) : (
        <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-2.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Awaiting review
        </span>
      )}

      {canVerify && step.verificationStatus !== "verified" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReview("verified", null)}
          className="inline-flex min-h-8 items-center gap-1 rounded-full bg-slate-900 px-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Verify
        </button>
      ) : null}
      {canVerify && step.verificationStatus !== "rejected" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setRejecting(true)}
          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-slate-200 px-2.5 font-medium text-slate-600 hover:border-red-300 hover:text-red-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
        >
          Reject
        </button>
      ) : null}

      <ScanViewerDialog scan={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <EvidencePickerDialog
        open={picking}
        scans={scansForFloor(scans, floorId)}
        onOpenChange={setPicking}
        onPick={(tourId, note) => {
          setPicking(false);
          onEvidence(tourId, note);
        }}
      />
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        onConfirm={(note) => {
          setRejecting(false);
          onReview("rejected", note);
        }}
      />
    </div>
  );
}

function EvidencePickerDialog({
  open,
  scans,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  scans: ProgressionScan[];
  onOpenChange: (open: boolean) => void;
  onPick: (tourId: string, note: string | null) => void;
}) {
  const [tourId, setTourId] = useState("");
  const [note, setNote] = useState("");
  const selected = scans.find((s) => s.id === (tourId || scans[0]?.id)) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link a scan as evidence</DialogTitle>
        </DialogHeader>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Scan</span>
          <select
            value={selected?.id ?? ""}
            onChange={(e) => setTourId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scanLabel(scan)}
              </option>
            ))}
          </select>
        </label>
        {scans.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">
            No scans are linked to this floor yet. In Tour Manager, set a scan&apos;s tower and floor to use it here.
          </p>
        ) : null}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Where to look (optional)</span>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Flat 302 kitchen, north wall"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={!selected}
            onClick={() => selected && onPick(selected.id, note.trim() || null)}
          >
            Link scan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string | null) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this step?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The step stays ended but is marked as rejected so the site team can fix or re-capture it.
        </p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What's wrong? (optional)"
          aria-label="Reason for rejecting"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => onConfirm(note.trim() || null)}>
            Reject step
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------- verify from scan (split)

/**
 * Split view: the floor's 360 scan on the left, its ended-but-unreviewed steps
 * on the right. Verifying from here links the scan as the step's evidence.
 */
export function VerifyFromScanDialog({
  open,
  onOpenChange,
  floorLabel,
  floorId,
  scans,
  steps,
  busyIds,
  onReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorLabel: string;
  floorId: string;
  scans: ProgressionScan[];
  steps: ProgressionStepView[];
  busyIds: Set<string>;
  onReview: (step: ProgressionStepView, decision: ReviewDecision, note: string | null, tourId: string | null) => void;
}) {
  const ordered = useMemo(() => scansForFloor(scans, floorId), [scans, floorId]);
  const [scanId, setScanId] = useState("");
  const scan = ordered.find((s) => s.id === (scanId || ordered[0]?.id)) ?? null;
  const pending = steps.filter((s) => s.status === "completed" && s.verificationStatus !== "verified");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify from scan · {floorLabel}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-2">
            {ordered.length > 0 ? (
              <>
                <select
                  value={scan?.id ?? ""}
                  onChange={(e) => setScanId(e.target.value)}
                  aria-label="Scan to verify against"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ordered.map((s) => (
                    <option key={s.id} value={s.id}>
                      {scanLabel(s)}
                    </option>
                  ))}
                </select>
                {scan ? <MatterportViewer url={scan.matterportUrl} title={scan.name} /> : null}
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No scans are linked to {floorLabel} yet. In Tour Manager, set a scan&apos;s tower and floor to
                verify against it here.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {pending.length === 0
                ? "Nothing waiting for review on this floor."
                : `${pending.length} step${pending.length === 1 ? "" : "s"} waiting for review`}
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {pending.map((step) => {
                const busy = busyIds.has(step.id);
                const done = stepDoneDate(step);
                return (
                  <li key={step.id} className="space-y-2 p-3">
                    <p className="text-sm text-slate-800 dark:text-slate-100">
                      <span className="mr-1 tabular-nums text-slate-400">{step.stepNumber}.</span>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ended {done ? formatDate(done) : "—"}
                      {scan && done && done > scanDate(scan) ? " · after this scan was captured" : ""}
                      {step.verificationStatus === "rejected" ? " · previously rejected" : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-9 bg-slate-900 text-white hover:bg-slate-800"
                        disabled={busy}
                        onClick={() => onReview(step, "verified", null, scan?.id ?? null)}
                      >
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={busy}
                        onClick={() => onReview(step, "rejected", null, scan?.id ?? null)}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- freshness

/**
 * Flags when claims and scans are out of step for the selected floor:
 *  - progress ended after the latest scan (needs a new scan), or
 *  - a scan newer than the claims while steps still await review.
 */
export function FreshnessNote({
  steps,
  scans,
  floorId,
}: {
  steps: ProgressionStepView[];
  scans: ProgressionScan[];
  floorId: string;
}) {
  const floorScans = scans.filter((s) => s.floorId === floorId);
  const latestScan = floorScans.map(scanDate).sort().at(-1) ?? null;
  const ended = steps.filter((s) => s.status === "completed");
  const latestDone = ended.map(stepDoneDate).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  const awaiting = ended.filter((s) => s.verificationStatus !== "verified").length;
  if (!latestDone) return null;

  let message: string | null = null;
  let tone: "amber" | "sky" = "amber";
  if (!latestScan) {
    message = "No scan of this floor yet. Capture one to back up the ended steps.";
  } else if (latestDone > latestScan) {
    message = `Steps were ended after the latest scan (${formatDate(latestScan)}). Capture a new scan to back them up.`;
  } else if (awaiting > 0) {
    tone = "sky";
    message = `Latest scan (${formatDate(latestScan)}) is newer than the ticks. ${awaiting} step${awaiting === 1 ? "" : "s"} can be reviewed against it.`;
  }
  if (!message) return null;

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2 text-xs",
        tone === "amber"
          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
      )}
    >
      {tone === "amber" ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <ScanEye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {message}
    </p>
  );
}
