"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Camera, FileText, FolderOpen, AlertTriangle, ArrowUpRight } from "lucide-react";
import { TAB_PARAM } from "@/components/patterns/tab-workspace";
import { cn } from "@/lib/utils";

interface ProjectOverviewProps {
  tourCount: number;
  reportCount: number;
  documentCount: number;
  openIssueCount: number;
}

const stats = [
  {
    key: "tours",
    label: "Virtual Tours",
    hint: "Matterport scans",
    emptyHint: "No scans yet",
    tab: "overview",
    icon: Camera,
    accent: "brand",
  },
  {
    key: "reports",
    label: "Reports",
    hint: "Progress & inspections",
    emptyHint: "No reports yet",
    tab: "reports",
    icon: FileText,
    accent: "blue",
  },
  {
    key: "documents",
    label: "Documents",
    hint: "Drawings & files",
    emptyHint: "No documents yet",
    tab: "documents",
    icon: FolderOpen,
    accent: "slate",
  },
  {
    key: "issues",
    label: "Open Issues",
    hint: "Needs attention",
    emptyHint: "All clear",
    tab: "issues",
    icon: AlertTriangle,
    accent: "amber",
  },
] as const;

const accentStyles = {
  brand: {
    rail: "from-brand-accent to-brand-accent/40",
    icon: "bg-brand-accent/12 text-brand-accent ring-brand-accent/15",
    wash: "from-brand-accent/[0.08] via-transparent to-transparent",
    hover: "hover:border-brand-accent/30 hover:shadow-brand-accent/5",
    value: "group-hover:text-brand-accent",
  },
  blue: {
    rail: "from-sky-500 to-sky-400/40",
    icon: "bg-sky-500/12 text-sky-600 ring-sky-500/15 dark:text-sky-400",
    wash: "from-sky-500/[0.08] via-transparent to-transparent",
    hover: "hover:border-sky-500/30 hover:shadow-sky-500/5",
    value: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
  },
  slate: {
    rail: "from-slate-600 to-slate-400/40",
    icon: "bg-slate-500/12 text-slate-600 ring-slate-500/15 dark:text-slate-300",
    wash: "from-slate-500/[0.08] via-transparent to-transparent",
    hover: "hover:border-slate-400/40 hover:shadow-slate-500/5",
    value: "group-hover:text-slate-800 dark:group-hover:text-slate-100",
  },
  amber: {
    rail: "from-amber-500 to-amber-400/40",
    icon: "bg-amber-500/12 text-amber-600 ring-amber-500/15 dark:text-amber-400",
    wash: "from-amber-500/[0.08] via-transparent to-transparent",
    hover: "hover:border-amber-500/30 hover:shadow-amber-500/5",
    value: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
} as const;

export function ProjectOverview({
  tourCount,
  reportCount,
  documentCount,
  openIssueCount,
}: ProjectOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = {
    tours: tourCount,
    reports: reportCount,
    documents: documentCount,
    issues: openIssueCount,
  };

  const goToTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(TAB_PARAM, tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <section aria-label="Project summary" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Project pulse
          </p>
          <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-900 dark:text-white">
            Content at a glance
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat, index) => {
          const value = values[stat.key];
          const styles = accentStyles[stat.accent];
          const isEmpty = value === 0;
          const isAlert = stat.key === "issues" && value > 0;

          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => goToTab(stat.tab)}
              style={{ animationDelay: `${index * 60}ms` }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left",
                "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.16)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:ring-offset-2",
                "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none dark:hover:bg-slate-900",
                "motion-safe:animate-[fadeInUp_0.45s_ease-out_both]",
                "cursor-pointer",
                styles.hover,
                isAlert && "border-amber-300/60 dark:border-amber-500/30"
              )}
            >
              {/* Soft top wash */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
                  styles.wash
                )}
                aria-hidden
              />

              {/* Accent rail */}
              <div
                className={cn(
                  "absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b opacity-80 transition-opacity duration-200 group-hover:opacity-100",
                  styles.rail
                )}
                aria-hidden
              />

              <div className="relative flex items-start gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 font-display text-3xl font-bold tracking-tight text-slate-900 tabular-nums transition-colors duration-200 dark:text-white sm:text-4xl",
                      styles.value
                    )}
                  >
                    {value}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isAlert
                        ? "font-medium text-amber-600 dark:text-amber-400"
                        : "text-slate-500"
                    )}
                  >
                    {isEmpty ? stat.emptyHint : stat.hint}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105",
                      styles.icon
                    )}
                  >
                    <stat.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 dark:text-slate-600"
                    aria-hidden
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
