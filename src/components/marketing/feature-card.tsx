import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "group surface-card flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent/10 ring-1 ring-brand-accent/20 transition-colors group-hover:bg-brand-accent/15">
        <Icon className="h-6 w-6 text-brand-accent-dark" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-lg font-semibold text-brand-primary dark:text-white">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </article>
  );
}
