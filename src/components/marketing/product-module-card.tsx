import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: string[];
  href: string;
  className?: string;
  featured?: boolean;
}

export function ProductModuleCard({
  icon: Icon,
  title,
  description,
  highlights,
  href,
  className,
  featured = false,
}: ProductModuleCardProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-soft",
        featured
          ? "border-brand-accent/30 bg-brand-primary text-white shadow-glow"
          : "surface-card border-slate-200/70 dark:border-slate-800",
        className
      )}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-accent/20 blur-2xl" />
      )}
      <div className="relative flex flex-1 flex-col p-6 lg:p-8">
        <div
          className={cn(
            "mb-5 flex h-12 w-12 items-center justify-center rounded-xl ring-1",
            featured
              ? "bg-brand-accent/15 ring-brand-accent/30"
              : "bg-brand-accent/10 ring-brand-accent/20"
          )}
        >
          <Icon
            className={cn("h-6 w-6", featured ? "text-brand-accent" : "text-brand-accent-dark")}
            strokeWidth={1.75}
          />
        </div>
        <h3
          className={cn(
            "font-display text-xl font-semibold",
            featured ? "text-white" : "text-brand-primary dark:text-white"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            featured ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
          )}
        >
          {description}
        </p>
        <ul className="mt-5 flex-1 space-y-2">
          {highlights.map((item) => (
            <li
              key={item}
              className={cn(
                "flex items-start gap-2 text-sm",
                featured ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
              )}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              {item}
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className={cn(
            "mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
            featured
              ? "text-brand-accent hover:text-white"
              : "text-brand-accent-dark hover:text-brand-primary dark:hover:text-white"
          )}
        >
          Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
