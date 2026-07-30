import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div className={cn("surface-card p-5 transition-all hover:shadow-soft", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-1 font-display text-3xl font-bold tracking-tight text-brand-primary dark:text-white">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
          {trend && (
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
          <Icon className="h-5 w-5 text-slate-700 dark:text-slate-300" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
