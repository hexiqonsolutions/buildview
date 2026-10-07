import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SponsorLogo } from "@/components/marketing/sponsor-logo";
import {
  getSponsorsByPlacement,
  getSpotlightSponsor,
} from "@/lib/sponsors";
import { cn } from "@/lib/utils";

const audienceLabels = [
  "Developers",
  "Contractors",
  "Architects",
  "Consultants",
  "Project Owners",
  "PMCs",
] as const;

export function HomePartnersSection() {
  const partners = getSponsorsByPlacement("trust-strip");
  const spotlight = getSpotlightSponsor();

  if (partners.length === 0 && !spotlight) {
    return null;
  }

  return (
    <section
      aria-labelledby="home-partners-heading"
      className="relative border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Soft bridge from dark hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-brand-primary/8 to-transparent dark:from-slate-950"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-accent/35 to-transparent"
      />

      <div className="site-container relative py-12 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Trusted across the construction lifecycle
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {audienceLabels.map((label) => (
              <li key={label}>
                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {partners.length > 0 && (
          <div className="mt-10 md:mt-12">
            <h2
              id="home-partners-heading"
              className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
            >
              {partners.every((partner) => partner.kind === "technology")
                ? "Capture technology"
                : "Technology & industry partners"}
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((sponsor) => (
                <li key={sponsor.id}>
                  <div
                    className={cn(
                      "group flex min-h-19 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-4",
                      "transition-all duration-200 motion-reduce:transition-none",
                      "hover:border-brand-accent/35 hover:bg-white hover:shadow-soft",
                      "dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-brand-accent/25 dark:hover:bg-slate-900"
                    )}
                  >
                    <SponsorLogo sponsor={sponsor} size="md" className="w-full" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {spotlight && (
          <article
            className={cn(
              "relative mt-10 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-slate-50 p-6 shadow-soft md:mt-12 md:p-8",
              "dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-accent/10 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-6 dark:border-slate-700 dark:bg-slate-900 lg:h-28 lg:w-52">
                {spotlight.logoSrc ? (
                  <Image
                    src={spotlight.logoSrc}
                    alt={`${spotlight.name} logo`}
                    width={180}
                    height={64}
                    className="h-11 w-auto max-w-full object-contain md:h-12"
                  />
                ) : (
                  <span className="font-display text-xl font-bold text-slate-700 dark:text-slate-200">
                    {spotlight.name}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-brand-accent/30 bg-brand-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-accent-dark dark:text-brand-accent">
                    {spotlight.kind === "technology"
                      ? "Capture technology"
                      : "Partner spotlight"}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-brand-primary dark:text-white md:text-2xl">
                  {spotlight.name}
                </h3>
                {spotlight.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
                    {spotlight.description}
                  </p>
                )}
                {spotlight.href && (
                  <Link
                    href={spotlight.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-brand-accent-dark transition-colors duration-200 hover:text-brand-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 dark:hover:text-brand-accent"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
