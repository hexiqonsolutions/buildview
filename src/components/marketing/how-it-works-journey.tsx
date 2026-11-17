import { Camera, Layers, Share2, Tags, type LucideIcon } from "lucide-react";
import type { ProcessStep } from "@/components/marketing/process-timeline";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<string, LucideIcon> = {
  Capture: Camera,
  Process: Layers,
  Enhance: Tags,
  Share: Share2,
};

export function HowItWorksJourney({
  steps,
  className,
}: {
  steps: ProcessStep[];
  className?: string;
}) {
  return (
    <ol className={cn("relative mx-auto max-w-3xl", className)}>
      <div
        className="absolute bottom-6 left-[1.15rem] top-6 w-px bg-linear-to-b from-brand-accent/0 via-brand-accent/55 to-brand-accent/0 md:left-[1.4rem]"
        aria-hidden
      />

      {steps.map((item, index) => {
        const Icon = STEP_ICONS[item.title] ?? Camera;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={item.step}
            className={cn(
              "relative grid grid-cols-[2.5rem_1fr] gap-5 pb-12 md:grid-cols-[3rem_1fr] md:gap-8 md:pb-14",
              isLast && "pb-0 md:pb-0",
              "motion-safe:animate-slide-up"
            )}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="relative z-10 flex justify-center pt-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-accent/40 bg-brand-primary text-brand-accent shadow-[0_0_0_6px_rgba(5,5,5,1)] md:h-11 md:w-11">
                <Icon className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-4xl font-bold leading-none tracking-tight text-white/12 md:text-6xl">
                  {item.step}
                </span>
                <h3 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {item.title}
                </h3>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                {item.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
