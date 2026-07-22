import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  reversed?: boolean;
}

export function ServiceSection({
  id,
  icon: Icon,
  title,
  description,
  features,
  reversed = false,
}: ServiceSectionProps) {
  return (
    <article
      id={id}
      className="scroll-mt-28 surface-card overflow-hidden"
    >
      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-2",
          reversed && "lg:[&>*:first-child]:order-2"
        )}
      >
        <div className="flex flex-col justify-center p-8 lg:p-12">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent/10 ring-1 ring-brand-accent/20">
            <Icon className="h-7 w-7 text-brand-accent-dark" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white lg:text-3xl">
            {title}
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent-dark transition-colors hover:text-brand-primary dark:hover:text-white"
          >
            Request this service <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800/80 lg:min-h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 via-transparent to-brand-primary/5" />
          <Icon className="relative h-28 w-28 text-brand-accent/25" strokeWidth={1} />
        </div>
      </div>
    </article>
  );
}
