import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string;
  label: string;
  className?: string;
}

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80",
        className
      )}
    >
      <p className="font-display text-3xl font-bold tracking-tight text-brand-primary dark:text-white md:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
