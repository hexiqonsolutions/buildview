import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { cn } from "@/lib/utils";

export function ServicePageHero({
  eyebrow,
  headline,
  description,
  primaryCta,
  secondaryCta,
  className,
}: {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCta: { href: string; label: string; eventLabel: string };
  secondaryCta?: { href: string; label: string };
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-brand-primary text-white",
        "border-b border-white/5",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 70% 10%, rgba(164,207,48,0.16), transparent 55%), linear-gradient(160deg, #050505 0%, #0f120d 45%, #050505 100%)",
        }}
      />
      <div className="site-container relative py-16 md:py-20 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
          {headline}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
          {description}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="accent" size="lg" className="shadow-glow" asChild>
            <TrackedLink href={primaryCta.href} eventLabel={primaryCta.eventLabel}>
              {primaryCta.label} <ArrowRight className="h-5 w-5" />
            </TrackedLink>
          </Button>
          {secondaryCta ? (
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
