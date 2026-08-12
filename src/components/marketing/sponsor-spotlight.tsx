import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section } from "@/components/marketing/section";
import { getSpotlightSponsor } from "@/lib/sponsors";

export function SponsorSpotlight() {
  const sponsor = getSpotlightSponsor();

  if (!sponsor) {
    return null;
  }

  return (
    <Section containerClassName="max-w-5xl">
      <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950 md:p-8">
        <div className="absolute right-4 top-4 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Partner
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-6 dark:border-slate-800 dark:bg-slate-900 md:h-24 md:w-48">
            {sponsor.logoSrc ? (
              <Image
                src={sponsor.logoSrc}
                alt={`${sponsor.name} logo`}
                width={160}
                height={56}
                className="h-10 w-auto object-contain md:h-12"
              />
            ) : (
              <span className="font-display text-xl font-bold text-slate-600 dark:text-slate-300">
                {sponsor.name}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-8 md:pr-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent-dark">
              Partner spotlight
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-brand-primary dark:text-white md:text-2xl">
              {sponsor.name}
            </h3>
            {sponsor.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
                {sponsor.description}
              </p>
            )}
            {sponsor.href && (
              <Link
                href={sponsor.href}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent-dark transition-colors hover:text-brand-primary dark:hover:text-brand-accent"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </article>
    </Section>
  );
}
