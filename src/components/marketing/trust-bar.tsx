const partners = [
  "Meridian Development",
  "Apex Construction",
  "Design Collective",
  "UrbanCore Builders",
  "Pacific Structures",
  "Northline PMC",
];

export function TrustBar() {
  return (
    <div className="border-y border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="site-container py-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Trusted by construction teams worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((name) => (
            <span
              key={name}
              className="font-display text-sm font-semibold tracking-wide text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
