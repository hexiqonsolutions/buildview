"use client";

import { X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

interface SidebarBrandHeaderProps {
  homeHref: string;
  tagline: string;
  onMobileClose?: () => void;
  workspace?: {
    title: string;
    subtitle?: string | null;
  } | null;
  className?: string;
}

/**
 * Soft UI brand lockup used at the top of every dashboard sidebar
 * (admin Control Center + client portal).
 */
export function SidebarBrandHeader({
  homeHref,
  tagline,
  onMobileClose,
  workspace,
  className,
}: SidebarBrandHeaderProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800",
          "bg-white dark:bg-slate-950"
        )}
      >
        <div className="relative flex items-start justify-between gap-2 px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-1.5">
            <BrandLogo
              href={homeHref}
              size="xl"
              className="max-w-[15rem] overflow-hidden"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {tagline}
            </p>
          </div>

          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="mt-0.5 cursor-pointer rounded-xl p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {workspace && (
        <div className="border-b border-slate-200/80 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div
            className={cn(
              "rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5",
              "shadow-[0_1px_2px_rgba(15,23,42,0.03)]",
              "dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Active Workspace
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {workspace.title}
            </p>
            {workspace.subtitle ? (
              <p className="truncate text-xs text-slate-500">{workspace.subtitle}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
