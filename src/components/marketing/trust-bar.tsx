import { getSponsorsByPlacement } from "@/lib/sponsors";
import { SponsorLogo } from "@/components/marketing/sponsor-logo";
import { cn } from "@/lib/utils";

const audienceLabels = [
  "Developers",
  "Contractors",
  "Architects",
  "Consultants",
  "Project Owners",
  "PMCs",
];

export function TrustBar() {
  const partners = getSponsorsByPlacement("trust-strip");

  return (
    <div className="border-y border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="site-container py-8 md:py-10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Trusted across the construction lifecycle
        </p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {audienceLabels.map((label) => (
            <li key={label}>
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {label}
              </span>
            </li>
          ))}
        </ul>

        {partners.length > 0 && (
          <div className="mt-8">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Technology &amp; industry partners
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((sponsor) => (
                <li key={sponsor.id}>
                  <div
                    className={cn(
                      "group flex min-h-[4.25rem] items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3",
                      "transition-all duration-200 motion-reduce:transition-none",
                      "hover:border-brand-accent/35 hover:bg-white hover:shadow-soft",
                      "dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-brand-accent/25 dark:hover:bg-slate-900"
                    )}
                  >
                    <SponsorLogo sponsor={sponsor} size="sm" className="w-full" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
