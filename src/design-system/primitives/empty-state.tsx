import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "ops" | "intel";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "intel",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        variant === "intel" ? "intel-card" : "ops-card",
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Icon className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
      </div>
      <p className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
