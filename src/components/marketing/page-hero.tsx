import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
}

export function PageHero({ eyebrow, title, description, className }: PageHeroProps) {
  return (
    <section className={cn("mesh-gradient relative overflow-hidden text-white", className)}>
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="site-container relative py-20 text-center lg:py-24">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-tight">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
          {description}
        </p>
      </div>
    </section>
  );
}
