const partners = [
  "Developers",
  "Contractors",
  "Architects",
  "Consultants",
  "Project Owners",
  "PMCs",
];

export function TrustBar() {
  return (
    <div className="border-y border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="site-container py-7 md:py-8">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Trusted by developers, contractors, architects, consultants, and project owners to
          simplify construction monitoring
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12">
          {partners.map((name) => (
            <span
              key={name}
              className="font-display text-sm font-semibold tracking-wide text-slate-400 transition-colors duration-200 hover:text-brand-primary dark:hover:text-slate-200"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
