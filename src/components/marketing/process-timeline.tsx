import { cn } from "@/lib/utils";

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
  role?: string;
};

export function ProcessTimeline({
  steps,
  className,
}: {
  steps: ProcessStep[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-6",
        steps.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        className
      )}
    >
      {steps.map((item, index) => (
        <li key={item.step} className="relative text-left">
          {index < steps.length - 1 && (
            <div
              className="absolute left-[3.25rem] top-7 hidden h-px w-[calc(100%-3.25rem)] bg-slate-200 dark:bg-slate-700 lg:block"
              aria-hidden
            />
          )}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient font-display text-lg font-bold text-brand-primary shadow-soft">
            {item.step}
          </div>
          {item.role ? (
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-accent-dark dark:text-brand-accent">
              {item.role}
            </p>
          ) : null}
          <h3
            className={cn(
              "font-display text-lg font-semibold text-brand-primary dark:text-white",
              item.role ? "mt-1.5" : "mt-5"
            )}
          >
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {item.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
