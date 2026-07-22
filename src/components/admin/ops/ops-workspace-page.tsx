import type { LucideIcon } from "lucide-react";
import { OpsWorkspaceBanner } from "@/components/admin/ops/ops-workspace-banner";
import { OpsPrimaryAction } from "@/components/admin/ops/ops-primary-action";

interface OpsWorkspacePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  primaryAction?: { href: string; label: string };
  actions?: React.ReactNode;
  showBanner?: boolean;
  children: React.ReactNode;
}

export function OpsWorkspacePage({
  title,
  description,
  icon: Icon,
  primaryAction,
  actions,
  showBanner = true,
  children,
}: OpsWorkspacePageProps) {
  return (
    <div className="space-y-6">
      {showBanner && <OpsWorkspaceBanner />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {primaryAction && (
            <OpsPrimaryAction href={primaryAction.href} label={primaryAction.label} />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
