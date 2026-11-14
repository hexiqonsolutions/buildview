import { SponsorLogo } from "@/components/marketing/sponsor-logo";
import { getSponsorsByPlacement } from "@/lib/sponsors";
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
  const partners = getSponsorsByPlacement("trust-strip").filter(
    (partner) => partner.kind !== "technology"
  );

  return (
    <section
      aria-labelledby="home-partners-heading"
      className="relative border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-brand-primary/10 to-transparent dark:from-slate-950"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-accent/35 to-transparent"
      />

      <div className="site-container relative py-12 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="home-partners-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
          >
            Trusted across the construction lifecycle
          </h2>
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

        {partners.length > 0 ? (
          <div className="mt-10 md:mt-12">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Technology & industry partners
            </p>
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
        ) : null}
      </div>
    </section>
  );
}
