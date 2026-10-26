import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  reversed?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  /** 1-based index shown as 01, 02… */
  index?: number;
}

function BrowserFrame({
  children,
  label = "app.buildview.io",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)] dark:ring-white/5">
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/90 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <span className="truncate rounded-md bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-slate-500 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
            {label}
          </span>
        </div>
        <div className="w-10 shrink-0" aria-hidden />
      </div>
      {children}
    </div>
  );
}

export function ServiceSection({
  id,
  icon: Icon,
  title,
  description,
  features,
  reversed = false,
  imageSrc,
  imageAlt,
  index,
}: ServiceSectionProps) {
  const indexLabel =
    typeof index === "number" ? String(index).padStart(2, "0") : null;

  return (
    <article
      id={id}
      className="scroll-mt-28 border-b border-slate-200/70 pb-16 last:border-b-0 last:pb-0 dark:border-slate-800/80 lg:pb-20"
    >
      <div
        className={cn(
          "grid items-center gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-16",
          reversed && "lg:[&>*:first-child]:order-2"
        )}
      >
        <div className="lg:col-span-5">
          {indexLabel && (
            <p
              className="mb-4 font-display text-sm font-semibold tracking-[0.2em] text-brand-accent-dark dark:text-brand-accent"
              aria-hidden
            >
              {indexLabel}
            </p>
          )}

          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10 ring-1 ring-brand-accent/20">
            <Icon className="h-5 w-5 text-brand-accent-dark" strokeWidth={1.75} />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-primary dark:text-white sm:text-3xl lg:text-[2rem] lg:leading-tight">
            {title}
          </h2>

          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>

          <ul className="mt-7 space-y-3">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm leading-snug text-slate-700 dark:text-slate-300"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent-dark dark:text-brand-accent">
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/contact"
            className="group mt-8 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg text-sm font-semibold text-brand-accent-dark transition-colors duration-200 hover:text-brand-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 dark:hover:text-white"
          >
            Request this service
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          <div
            className={cn(
              "relative rounded-[1.75rem] p-3 sm:p-4 lg:p-5",
              "bg-linear-to-br from-slate-100 via-slate-50 to-emerald-50/40",
              "dark:from-slate-900 dark:via-slate-900/80 dark:to-emerald-950/20",
              "ring-1 ring-slate-200/70 dark:ring-slate-700/60"
            )}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-accent/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-brand-primary/5 blur-3xl dark:bg-brand-primary/20"
              aria-hidden
            />

            {imageSrc ? (
              <BrowserFrame>
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950">
                  <Image
                    src={imageSrc}
                    alt={imageAlt ?? title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover object-top"
                  />
                </div>
              </BrowserFrame>
            ) : (
              <BrowserFrame>
                <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
                  <Icon
                    className="h-24 w-24 text-brand-accent/25"
                    strokeWidth={1}
                    aria-hidden
                  />
                </div>
              </BrowserFrame>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
