import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  className?: string;
  /** @deprecated Variants are unified */
  variant?: "ops" | "intel";
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendTone = "up",
  className,
}: DashboardMetricCardProps) {
  const trendClass =
    trendTone === "down"
      ? "text-rose-600"
      : trendTone === "neutral"
        ? "text-slate-500"
        : "text-emerald-600";

  return (
    <div className={cn("intel-card dashboard-card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="dashboard-metric-label">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trendClass)}>{trend}</p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
