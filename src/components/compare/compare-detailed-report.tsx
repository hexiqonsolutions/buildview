"use client";

import { useRef } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Printer,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatStatus } from "@/lib/utils";
import type { ComparisonSnapshot } from "@/lib/comparison/types";
import { buildTimelineNodes, isBlankComparisonSnapshot } from "@/lib/comparison/analytics";

function safeScanDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1990) return "—";
  return formatDate(value);
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid space-y-3 border-b border-slate-200 pb-5 last:border-0 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ListOrEmpty({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="text-sm text-slate-700 dark:text-slate-300">
          · {item}
        </li>
      ))}
    </ul>
  );
}

export function CompareDetailedReportDialog({
  snapshot,
  open,
  onOpenChange,
}: {
  snapshot: ComparisonSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const blank = isBlankComparisonSnapshot(snapshot);
  const nodes = buildTimelineNodes(snapshot);
  const ai = snapshot.aiPlaceholder;

  function handlePrint() {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Comparison Report — ${snapshot.project.name}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        h3 { font-size: 12px; margin: 0 0 6px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        p, li { font-size: 13px; margin: 0; }
        ul { padding-left: 18px; margin: 0; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 8px 0 12px; }
        .pill { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
        .pill strong { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .pill span { display: block; margin-top: 4px; font-weight: 600; }
        .section { margin-bottom: 8px; }
        @media print { body { margin: 12px; } }
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="font-display text-lg">Detailed Comparison Report</DialogTitle>
              <p className="mt-1 text-sm text-slate-500">
                {snapshot.project.name}
                {snapshot.project.client_name ? ` · ${snapshot.project.client_name}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handlePrint}
                disabled={blank}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print / PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {blank ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Select two scans and run Compare to generate a detailed report.
            </p>
          ) : (
            <div ref={printRef} className="space-y-5">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  {snapshot.project.name} — Progress Comparison
                </h1>
                <p className="meta mt-1 text-sm text-slate-500">
                  Window: {snapshot.dateWindowLabel} · Generated {formatDate(new Date())}
                </p>
              </div>

              <Section title="Scans compared" icon={Camera}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <MetricPill
                    label="Scan A"
                    value={`${snapshot.scanA.name} · ${safeScanDate(
                      snapshot.scanA.capture_date ?? snapshot.scanA.created_at
                    )}`}
                  />
                  <MetricPill
                    label="Scan B"
                    value={`${snapshot.scanB.name} · ${safeScanDate(
                      snapshot.scanB.capture_date ?? snapshot.scanB.created_at
                    )}`}
                  />
                  <MetricPill
                    label="Engineer A"
                    value={snapshot.scanA.metadata.engineer || "—"}
                  />
                  <MetricPill
                    label="Engineer B"
                    value={snapshot.scanB.metadata.engineer || "—"}
                  />
                </div>
              </Section>

              <Section title="Progress & health" icon={ClipboardList}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricPill label="Previous" value={`${snapshot.kpis.previousProgress}%`} />
                  <MetricPill label="Current" value={`${snapshot.kpis.currentProgress}%`} />
                  <MetricPill
                    label="Change"
                    value={`${snapshot.kpis.difference >= 0 ? "+" : ""}${snapshot.kpis.difference}%`}
                  />
                  <MetricPill label="Schedule" value={formatStatus(snapshot.kpis.scheduleStatus)} />
                  <MetricPill label="Quality" value={formatStatus(snapshot.kpis.qualityStatus)} />
                  <MetricPill label="Safety" value={formatStatus(snapshot.kpis.safetyStatus)} />
                  <MetricPill label="Health score" value={snapshot.kpis.healthScore} />
                </div>
              </Section>

              <Section title="Executive summary" icon={Sparkles}>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {ai.overallProgress}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Key changes
                    </h3>
                    <ListOrEmpty items={ai.keyChanges} empty="No key changes recorded." />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Pending activities
                    </h3>
                    <ListOrEmpty items={ai.pendingActivities} empty="No pending activities." />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Critical risks
                    </h3>
                    <ListOrEmpty items={ai.criticalRisks} empty="No critical risks flagged." />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Recommended actions
                    </h3>
                    <ListOrEmpty items={ai.recommendedActions} empty="No recommendations." />
                  </div>
                </div>
              </Section>

              <Section title="Trade progress" icon={CheckCircle2}>
                {snapshot.tradeProgress.length === 0 ? (
                  <p className="text-sm text-slate-500">No trade progress data for this window.</p>
                ) : (
                  <div className="space-y-2">
                    {snapshot.tradeProgress.map((trade) => (
                      <div
                        key={trade.trade}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <span className="font-medium text-slate-900 dark:text-white">
                          {trade.trade}
                        </span>
                        <div className="flex items-center gap-2">
                          {typeof trade.delta === "number" ? (
                            <span className="text-xs text-slate-500">
                              {trade.delta >= 0 ? "+" : ""}
                              {trade.delta}%
                            </span>
                          ) : null}
                          <Badge variant="secondary" className="capitalize">
                            {trade.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Issues" icon={AlertTriangle}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricPill label="New" value={snapshot.newIssues.length} />
                  <MetricPill label="Resolved" value={snapshot.resolvedIssues.length} />
                  <MetricPill label="Pending" value={snapshot.pendingIssues.length} />
                  <MetricPill label="Critical" value={snapshot.criticalIssues.length} />
                </div>
                {snapshot.criticalIssues.length > 0 && (
                  <div className="mt-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Critical issue titles
                    </h3>
                    <ListOrEmpty
                      items={snapshot.criticalIssues.map((i) => i.title)}
                      empty="None"
                    />
                  </div>
                )}
                {snapshot.newIssues.length > 0 && (
                  <div className="mt-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      New issues in window
                    </h3>
                    <ListOrEmpty items={snapshot.newIssues.map((i) => i.title)} empty="None" />
                  </div>
                )}
              </Section>

              <Section title="Reports & documents" icon={FileText}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricPill label="Reports in window" value={snapshot.reportsBetween.length} />
                  <MetricPill label="New reports" value={snapshot.newReports.length} />
                  <MetricPill label="Documents added" value={snapshot.documentsBetween.length} />
                </div>
                {snapshot.reportsBetween.length > 0 && (
                  <div className="mt-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Reports
                    </h3>
                    <ListOrEmpty
                      items={snapshot.reportsBetween.map(
                        (r) => `${r.title} (${formatStatus(r.report_type)})`
                      )}
                      empty="None"
                    />
                  </div>
                )}
              </Section>

              <Section title="Site photos" icon={Camera}>
                <div className="grid grid-cols-2 gap-3">
                  <MetricPill label="Photos near Scan A" value={snapshot.photosA.length} />
                  <MetricPill label="Photos near Scan B" value={snapshot.photosB.length} />
                </div>
              </Section>

              <Section title="Engineer notes" icon={ClipboardList}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Scan A — {safeScanDate(snapshot.scanA.capture_date ?? snapshot.scanA.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {snapshot.engineerNotesA || "No notes recorded."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Scan B — {safeScanDate(snapshot.scanB.capture_date ?? snapshot.scanB.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {snapshot.engineerNotesB || "No notes recorded."}
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Activity between scans" icon={ClipboardList}>
                {snapshot.activities.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity between these scans yet.</p>
                ) : (
                  <ListOrEmpty
                    items={snapshot.activities.map(
                      (a) => `${a.label} · ${safeScanDate(a.timestamp)}`
                    )}
                    empty="None"
                  />
                )}
              </Section>

              <Section title="Timeline of changes" icon={ClipboardList}>
                <ListOrEmpty
                  items={nodes.map((n) => `${n.label} · ${safeScanDate(n.date)}`)}
                  empty="No timeline points."
                />
              </Section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CompareReportTrigger({
  onClick,
  disabled,
  className,
  label = "Generate Detailed Report",
  icon = "download",
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  icon?: "download" | "sparkles";
}) {
  const Icon = icon === "sparkles" ? Sparkles : Download;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
