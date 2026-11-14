import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function BenefitsGrid({
  items,
  className,
}: {
  items: { icon: LucideIcon; title: string; description: string }[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/15 ring-1 ring-brand-accent/25">
            <item.icon className="h-5 w-5 text-brand-accent-dark" aria-hidden />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-brand-primary dark:text-white">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
