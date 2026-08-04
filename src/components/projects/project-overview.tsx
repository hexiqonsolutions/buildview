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
    hint: "Virtual tour scans",
    emptyHint: "No scans yet",
    tab: "overview",
    icon: Camera,
  },
  {
    key: "reports",
    label: "Reports",
    hint: "Progress & inspections",
    emptyHint: "No reports yet",
    tab: "reports",
    icon: FileText,
  },
  {
    key: "documents",
    label: "Documents",
    hint: "Drawings & files",
    emptyHint: "No documents yet",
    tab: "documents",
    icon: FolderOpen,
  },
  {
    key: "issues",
    label: "Open Issues",
    hint: "Needs attention",
    emptyHint: "All clear",
    tab: "issues",
    icon: AlertTriangle,
  },
] as const;

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
                "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.1)]",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_32px_-12px_rgba(15,23,42,0.14)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2",
                "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none dark:hover:border-slate-700 dark:hover:bg-slate-900",
                "motion-safe:animate-[fadeInUp_0.45s_ease-out_both]",
                "cursor-pointer",
                isAlert && "border-slate-300 dark:border-slate-600"
              )}
            >
              <div className="relative flex items-start gap-3 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 font-display text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white sm:text-4xl">
                    {value}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isAlert ? "font-medium text-slate-700 dark:text-slate-300" : "text-slate-500"
                    )}
                  >
                    {isEmpty ? stat.emptyHint : stat.hint}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 transition-transform duration-200 group-hover:scale-105 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
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
