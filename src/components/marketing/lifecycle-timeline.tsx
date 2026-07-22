import { cn } from "@/lib/utils";

interface LifecyclePhase {
  phase: string;
  title: string;
  description: string;
}

interface LifecycleTimelineProps {
  phases: LifecyclePhase[];
  className?: string;
}

export function LifecycleTimeline({ phases, className }: LifecycleTimelineProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>
      {phases.map((item, index) => (
        <div key={item.phase} className="relative">
          {index < phases.length - 1 && (
            <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-brand-accent/60 to-brand-accent/10 lg:block" />
          )}
          <div className="surface-card h-full p-6 lg:p-8">
            <span className="inline-flex rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-accent-dark">
              {item.phase}
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold text-brand-primary dark:text-white">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
