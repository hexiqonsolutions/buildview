"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus } from "@/lib/utils";
import type { ComparisonSnapshot } from "@/lib/comparison/types";
import { buildTimelineNodes, isBlankComparisonSnapshot } from "@/lib/comparison/analytics";
import { documentAppearedAfterScanA, getComparisonWindow } from "@/lib/comparison/date-window";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  FileText,
  Sparkles,
  Calendar,
  ShieldCheck,
  HardHat,
  TrendingUp,
  Check,
  X,
  Layers,
  ClipboardList,
  StickyNote,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

function WidgetCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("compare-card flex flex-col overflow-hidden", className)}>
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

function ProgressRing({
  value,
  delta,
  previous,
}: {
  value: number;
  delta: number;
  previous: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-slate-800" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="text-slate-800 transition-all duration-700 dark:text-slate-200"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-slate-900 dark:text-white">{value}%</span>
          {delta !== 0 && (
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Previous scan: {previous}%
      </p>
    </div>
  );
}

export function CompareProgressSidebar({ snapshot }: { snapshot: ComparisonSnapshot }) {
  return (
    <WidgetCard title="Progress Summary" className="h-full">
      <TradeProgressList snapshot={snapshot} />
      <div className="mt-6 flex justify-center border-t border-slate-100 pt-6 dark:border-slate-800">
        <ProgressRing
          value={snapshot.kpis.currentProgress}
          delta={snapshot.kpis.difference}
          previous={snapshot.kpis.previousProgress}
        />
      </div>
    </WidgetCard>
  );
}

function TradeProgressList({ snapshot }: { snapshot: ComparisonSnapshot }) {
  return (
    <div className="space-y-3">
      {snapshot.tradeProgress.map((item) => (
        <div key={item.trade} className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-700 dark:text-slate-300">{item.trade}</span>
          <div className="flex items-center gap-2">
            {item.delta !== undefined && item.delta > 0 && (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">+{item.delta}%</span>
            )}
            {item.delta === 0 && item.status === "pending" && (
              <span className="text-xs text-slate-400">0%</span>
            )}
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.status === "completed"
                    ? "bg-slate-800 dark:bg-slate-200"
                    : item.status === "in_progress"
                      ? "bg-slate-500"
                      : "bg-slate-300"
                )}
                style={{
                  width:
                    item.status === "completed"
                      ? "100%"
                      : item.status === "in_progress"
                        ? "60%"
                        : item.status === "started"
                          ? "25%"
                          : "5%",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-width progress summary — sits below KPIs when viewers are immersive. */
export function CompareProgressSummary({ snapshot }: { snapshot: ComparisonSnapshot }) {
  return (
    <WidgetCard title="Progress Summary">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.tradeProgress.map((item) => (
            <div key={item.trade} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 dark:text-slate-300">{item.trade}</span>
              <div className="flex items-center gap-2">
                {item.delta !== undefined && item.delta > 0 && (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">+{item.delta}%</span>
                )}
                {item.delta === 0 && item.status === "pending" && (
                  <span className="text-xs text-slate-400">0%</span>
                )}
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.status === "completed"
                        ? "bg-slate-800 dark:bg-slate-200"
                        : item.status === "in_progress"
                          ? "bg-slate-500"
                          : "bg-slate-300"
                    )}
                    style={{
                      width:
                        item.status === "completed"
                          ? "100%"
                          : item.status === "in_progress"
                            ? "60%"
                            : item.status === "started"
                              ? "25%"
                              : "5%",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center lg:justify-end">
          <ProgressRing
            value={snapshot.kpis.currentProgress}
            delta={snapshot.kpis.difference}
            previous={snapshot.kpis.previousProgress}
          />
        </div>
      </div>
    </WidgetCard>
  );
}

export function CompareKpiRow({
  snapshot,
  blank = false,
}: {
  snapshot: ComparisonSnapshot;
  blank?: boolean;
}) {
  const { kpis } = snapshot;
  const openTotal =
    snapshot.pendingIssues.length + snapshot.newIssues.length + snapshot.criticalIssues.length;
  const newIssues = snapshot.newIssues.length;

  const cards = [
    {
      label: "Overall Progress",
      value: blank ? "—" : `${kpis.currentProgress}%`,
      sub: blank ? "awaiting scans" : `from ${kpis.previousProgress}%`,
      icon: TrendingUp,
      tone: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
      ring: !blank,
    },
    {
      label: "Schedule Status",
      value: blank
        ? "—"
        : kpis.scheduleStatus === "on_track"
          ? "On Track"
          : kpis.scheduleStatus === "at_risk"
            ? "At Risk"
            : "Delayed",
      sub: "vs planned timeline",
      icon: Calendar,
      tone: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "Quality Status",
      value: blank
        ? "—"
        : kpis.qualityStatus === "good"
          ? "Good"
          : kpis.qualityStatus === "review"
            ? "Review"
            : "Concern",
      sub: blank ? "awaiting data" : "No major issues",
      icon: ShieldCheck,
      tone: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "Safety Status",
      value: blank
        ? "—"
        : kpis.safetyStatus === "clear"
          ? "Good"
          : kpis.safetyStatus === "watch"
            ? "Watch"
            : "Alert",
      sub: blank ? "awaiting data" : "Zero incidents",
      icon: HardHat,
      tone: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "Open Issues",
      value: blank ? "—" : String(openTotal),
      sub: blank ? "awaiting data" : newIssues > 0 ? `+${newIssues} new` : "no new issues",
      icon: AlertTriangle,
      tone: "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800",
      alert: !blank && newIssues > 0,
    },
    {
      label: "Project Health Score",
      value: blank ? "—" : `${Math.round(kpis.healthScore)}`,
      sub: "/ 100",
      icon: TrendingUp,
      tone: "text-slate-700 bg-slate-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="compare-card flex items-center justify-between p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {card.value}
              {card.label === "Project Health Score" && !blank && (
                <span className="text-sm font-normal text-slate-400">/100</span>
              )}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                card.alert ? "font-medium text-red-500" : "text-slate-500"
              )}
            >
              {card.sub}
            </p>
          </div>
          {card.ring ? (
            <div className="relative h-12 w-12 shrink-0">
              <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
                <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeDasharray={113}
                  strokeDashoffset={113 - (kpis.currentProgress / 100) * 113}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", card.tone)}>
              <card.icon className="h-5 w-5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const changeIcons = {
  completed: CheckCircle2,
  new: Layers,
  pending: Clock,
  delayed: AlertTriangle,
  critical: AlertTriangle,
};

export function CompareChangesOverview({ snapshot }: { snapshot: ComparisonSnapshot }) {
  return (
    <WidgetCard title="Changes Overview">
      <div className="space-y-3">
        {snapshot.visualChanges.map((card) => {
          const Icon = changeIcons[card.id as keyof typeof changeIcons] ?? ClipboardList;
          return (
            <div key={card.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">{card.label}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {card.count} {card.id === "completed" ? "Areas" : card.id === "critical" ? "Items" : "Areas"}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function CompareDocumentsMatrix({ snapshot }: { snapshot: ComparisonSnapshot }) {
  const docs = snapshot.documentsBetween.slice(0, 6);

  return (
    <WidgetCard title="Document Comparison">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="pb-2">Document</th>
            <th className="pb-2 text-center">Scan A</th>
            <th className="pb-2 text-center">Scan B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {docs.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                No documents between these scans.
              </td>
            </tr>
          ) : (
            docs.map((doc) => {
              const window = getComparisonWindow(snapshot.scanA, snapshot.scanB);
              const inB = documentAppearedAfterScanA(doc, window);
              return (
                <tr key={doc.id}>
                  <td className="py-2.5 pr-2">
                    <p className="font-medium text-slate-900 dark:text-white">{doc.name}</p>
                    <p className="text-xs capitalize text-slate-400">{formatStatus(doc.category)}</p>
                  </td>
                  <td className="py-2.5 text-center">
                    {!inB ? (
                      <Check className="mx-auto h-4 w-4 text-slate-700 dark:text-slate-300" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-slate-300" />
                    )}
                  </td>
                  <td className="py-2.5 text-center">
                    <Check className="mx-auto h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </WidgetCard>
  );
}

export function CompareIssuesStats({ snapshot }: { snapshot: ComparisonSnapshot }) {
  const stats = [
    { label: "Resolved", count: snapshot.resolvedIssues.length, color: "text-slate-700 dark:text-slate-300" },
    { label: "New", count: snapshot.newIssues.length, color: "text-slate-700 dark:text-slate-300" },
    { label: "Pending", count: snapshot.pendingIssues.length, color: "text-slate-600 dark:text-slate-400" },
    { label: "Critical", count: snapshot.criticalIssues.length, color: "text-red-600" },
  ];

  return (
    <WidgetCard title="Issue Comparison">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/50"
          >
            <p className={cn("font-display text-2xl font-bold", s.color)}>{s.count}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

export function CompareReportsTable({ snapshot }: { snapshot: ComparisonSnapshot }) {
  const types = ["progress_report", "quality_report", "safety_report", "inspection_report"] as const;
  const labels: Record<string, string> = {
    progress_report: "Progress Report",
    quality_report: "Quality Report",
    safety_report: "Safety Report",
    inspection_report: "Inspection Report",
  };

  return (
    <WidgetCard title="Reports Comparison">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="pb-2">Report</th>
            <th className="pb-2">Scan A</th>
            <th className="pb-2">Scan B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {types.map((type) => {
            const reportA = snapshot.reportsBetween.find(
              (r) => r.report_type === type && new Date(r.report_date) <= new Date(snapshot.scanB.capture_date ?? snapshot.scanB.created_at)
            );
            const reportB = snapshot.reportsBetween.find((r) => r.report_type === type);
            const isNew = reportB && snapshot.newReports.some((n) => n.id === reportB.id);

            return (
              <tr key={type}>
                <td className="py-2.5 font-medium text-slate-900 dark:text-white">{labels[type]}</td>
                <td className="py-2.5 text-slate-500">
                  {reportA ? formatDate(reportA.report_date) : "—"}
                </td>
                <td className="py-2.5">
                  {reportB ? (
                    <span className={cn("text-slate-700", isNew && "font-medium text-slate-700 dark:text-slate-300")}>
                      {formatDate(reportB.report_date)}
                      {isNew && " · New"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WidgetCard>
  );
}

function PhotoPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[10px] text-slate-400">
      {label}
    </div>
  );
}

export function ComparePhotoCarousel({ snapshot }: { snapshot: ComparisonSnapshot }) {
  const pairs = Math.max(snapshot.photosA.length, snapshot.photosB.length, 3);

  return (
    <WidgetCard title="Photo Comparison">
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {Array.from({ length: Math.min(pairs, 6) }).map((_, i) => {
          const photoA = snapshot.photosA[i];
          const photoB = snapshot.photosB[i];
          const label =
            photoB?.eventTitle ?? photoA?.eventTitle ?? photoB?.caption ?? photoA?.caption ?? `Area ${i + 1}`;

          return (
          <div key={i} className="w-48 shrink-0 snap-start">
            <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              {label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="mb-1 text-[10px] uppercase text-slate-400">Before</p>
                {photoA ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoA.url}
                    alt="Before"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <PhotoPlaceholder label="No photo" />
                )}
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase text-slate-400">After</p>
                {photoB ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoB.url}
                    alt="After"
                    className="aspect-square w-full rounded-lg object-cover ring-2 ring-slate-400/40"
                  />
                ) : (
                  <PhotoPlaceholder label="No photo" />
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

export function CompareHorizontalTimeline({ snapshot }: { snapshot: ComparisonSnapshot }) {
  const nodes = buildTimelineNodes(snapshot);
  const blank = isBlankComparisonSnapshot(snapshot);

  return (
    <WidgetCard title="Timeline of Changes">
      <div className="relative flex items-start justify-between gap-2 overflow-x-auto pb-2">
        <div className="absolute left-4 right-4 top-3 h-px bg-slate-200 dark:bg-slate-700" />
        {nodes.map((node, i) => (
          <div key={node.id} className="relative z-10 flex min-w-[88px] max-w-[120px] flex-col items-center text-center">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[8px] font-bold text-white dark:border-slate-900 dark:bg-white dark:text-slate-900",
                node.type === "scan" && "bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 dark:bg-slate-800 dark:bg-slate-200"
              )}
            >
              {i + 1}
            </div>
            <p className="mt-2 line-clamp-2 text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {node.label}
            </p>
            <p className="text-[9px] text-slate-400">
              {blank || !node.date ? "—" : formatDate(node.date)}
            </p>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  matterport: Camera,
  report: FileText,
  issue: AlertTriangle,
  document: ClipboardList,
  note: StickyNote,
};

export function CompareActivityFeed({ snapshot }: { snapshot: ComparisonSnapshot }) {
  return (
    <WidgetCard title="Activity Log">
      {snapshot.activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-500">No activity between these scans yet.</p>
        </div>
      ) : (
        <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {snapshot.activities.map((activity) => {
            const Icon = activityIcons[activity.type] ?? Activity;
            return (
              <li key={activity.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{activity.label}</p>
                  <p className="text-xs text-slate-400">{formatDate(activity.timestamp)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

export function CompareEngineerNotes({
  snapshot,
  blank = false,
}: {
  snapshot: ComparisonSnapshot;
  blank?: boolean;
}) {
  const dateA = blank
    ? "—"
    : formatDate(snapshot.scanA.capture_date ?? snapshot.scanA.created_at);
  const dateB = blank
    ? "—"
    : formatDate(snapshot.scanB.capture_date ?? snapshot.scanB.created_at);

  return (
    <WidgetCard title="Engineer Notes">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Scan A — {dateA}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {snapshot.engineerNotesA || "No notes recorded."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Scan B — {dateB}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {snapshot.engineerNotesB || "No notes recorded."}
          </p>
        </div>
      </div>
    </WidgetCard>
  );
}

export function CompareAiSummary({
  snapshot,
  onOpenReport,
}: {
  snapshot: ComparisonSnapshot;
  onOpenReport?: () => void;
}) {
  const { aiPlaceholder: ai } = snapshot;
  const blank = isBlankComparisonSnapshot(snapshot);

  return (
    <div className="compare-card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Summary</h3>
          <Badge className="bg-slate-100 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            BETA
          </Badge>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {ai.overallProgress}
        </p>

        {ai.keyChanges.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Key changes
            </p>
            <ul className="space-y-1">
              {ai.keyChanges.map((c, i) => (
                <li key={i} className="text-xs text-slate-500">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ai.pendingActivities.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pending
            </p>
            <ul className="space-y-1">
              {ai.pendingActivities.map((c, i) => (
                <li key={i} className="text-xs text-slate-500">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ai.criticalRisks.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Risks
            </p>
            <ul className="space-y-1">
              {ai.criticalRisks.map((c, i) => (
                <li key={i} className="text-xs text-rose-600 dark:text-rose-400">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {ai.recommendedActions.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Recommended actions
            </p>
            <ul className="space-y-1">
              {ai.recommendedActions.map((c, i) => (
                <li key={i} className="text-xs text-slate-500">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-1 w-full cursor-pointer"
          onClick={onOpenReport}
          disabled={blank || !onOpenReport}
        >
          Generate Detailed Report
        </Button>
      </div>
    </div>
  );
}

/** @deprecated use CompareKpiRow */
export function CompareKpiGrid(props: { snapshot: ComparisonSnapshot }) {
  return <CompareKpiRow {...props} />;
}

/** @deprecated use CompareProgressSummary */
export function CompareProgressPanel(props: { snapshot: ComparisonSnapshot }) {
  return <CompareProgressSidebar {...props} />;
}

export function CompareVisualChanges(props: { snapshot: ComparisonSnapshot }) {
  return <CompareChangesOverview {...props} />;
}

export function CompareDocumentsTable(props: { snapshot: ComparisonSnapshot }) {
  return <CompareDocumentsMatrix {...props} />;
}

export function CompareReportsGrid(props: { snapshot: ComparisonSnapshot }) {
  return <CompareReportsTable {...props} />;
}

export function CompareIssuesGrid(props: { snapshot: ComparisonSnapshot }) {
  return <CompareIssuesStats {...props} />;
}

export function ComparePhotoSlider(props: { snapshot: ComparisonSnapshot }) {
  return <ComparePhotoCarousel {...props} />;
}

export function CompareTimelineStrip(props: { snapshot: ComparisonSnapshot }) {
  return <CompareHorizontalTimeline {...props} />;
}

export function CompareAiPanel(props: { snapshot: ComparisonSnapshot }) {
  return <CompareAiSummary {...props} />;
}
