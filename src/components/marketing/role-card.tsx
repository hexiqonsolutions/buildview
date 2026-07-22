import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function RoleCard({ icon: Icon, title, description, className }: RoleCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-6 transition-all hover:border-brand-accent/30 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900/60",
        className
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        <Icon className="h-5 w-5 text-brand-accent-dark" strokeWidth={1.75} />
      </div>
      <h3 className="font-display font-semibold text-brand-primary dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
