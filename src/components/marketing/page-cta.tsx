import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";

interface PageCtaProps {
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function PageCta({
  title,
  description,
  primaryLabel = "Book a Demo",
  primaryHref = "/contact",
  secondaryLabel,
  secondaryHref,
}: PageCtaProps) {
  return (
    <Section variant="accent" className="relative overflow-hidden">
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" className="shadow-glow" asChild>
            <Link href={primaryHref}>
              {primaryLabel} <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10"
              asChild
            >
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}
