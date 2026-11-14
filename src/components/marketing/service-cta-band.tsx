import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { Section } from "@/components/marketing/section";

export function ServiceCtaBand({
  headline,
  description,
  primary,
  secondary,
}: {
  headline: string;
  description: string;
  primary: { href: string; label: string; eventLabel: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <Section variant="accent" className="relative overflow-hidden">
      <div className="dot-pattern absolute inset-0 opacity-25" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(164,207,48,0.14), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">{headline}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">{description}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" size="lg" className="shadow-glow" asChild>
            <TrackedLink href={primary.href} eventLabel={primary.eventLabel}>
              {primary.label}
            </TrackedLink>
          </Button>
          {secondary ? (
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
