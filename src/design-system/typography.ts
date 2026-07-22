/** BuildView typography scale — aligned with portfolio showcase dashboard */

export const typography = {
  /** Admin ops page titles */
  opsPageTitle: "font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl",
  opsSectionTitle: "font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white md:text-xl",

  /** Client intelligence — executive dashboard */
  intelPageTitle: "font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl",
  intelSectionTitle: "font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white md:text-xl",
  intelHeroTitle: "font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl",

  /** Shared showcase tokens */
  eyebrow: "text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400",
  body: "text-sm text-slate-500",
  bodyMuted: "text-xs text-slate-400",
} as const;
