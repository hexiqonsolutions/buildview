import { getSponsorsByPlacement } from "@/lib/sponsors";
import { SponsorLogo } from "@/components/marketing/sponsor-logo";

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
      <div className="site-container py-7 md:py-8">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Trusted by developers, contractors, architects, consultants, and project owners to
          simplify construction monitoring
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
          {audienceLabels.map((name) => (
            <span
              key={name}
              className="font-display text-sm font-semibold tracking-wide text-slate-400 transition-colors duration-200 hover:text-brand-primary dark:hover:text-slate-200"
            >
              {name}
            </span>
          ))}
        </div>

        {partners.length > 0 && (
          <>
            <div className="mx-auto my-6 h-px max-w-3xl bg-slate-200 dark:bg-slate-800" />
            <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Technology &amp; industry partners
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
              {partners.map((sponsor) => (
                <li key={sponsor.id}>
                  <SponsorLogo sponsor={sponsor} size="md" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
