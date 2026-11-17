import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformCapability = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
};

export function PlatformCapabilities({
  items,
  className,
}: {
  items: PlatformCapability[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const featured = index === 0;

        return (
          <article
            key={item.id}
            id={item.id}
            className={cn(
              "group relative scroll-mt-28 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-soft transition duration-200",
              "hover:border-brand-accent/35 hover:shadow-md dark:border-slate-800 dark:bg-slate-950",
              "motion-safe:animate-slide-up",
              featured && "sm:col-span-2 xl:col-span-2 xl:row-span-1 xl:p-8"
            )}
            style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-accent/8 blur-2xl transition group-hover:bg-brand-accent/14"
              aria-hidden
            />

            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent/15 text-brand-accent-dark ring-1 ring-brand-accent/20">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="font-display text-sm font-semibold tabular-nums text-slate-300 dark:text-slate-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3
                className={cn(
                  "mt-5 font-display font-semibold tracking-tight text-brand-primary dark:text-white",
                  featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
                )}
              >
                {item.title}
              </h3>

              <p
                className={cn(
                  "mt-2 leading-relaxed text-slate-600 dark:text-slate-400",
                  featured ? "max-w-xl text-base" : "text-sm"
                )}
              >
                {item.description}
              </p>

              {item.features.length > 0 ? (
                <ul className="mt-auto flex flex-wrap gap-2 pt-5">
                  {item.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
