import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { CalendlyEmbed } from "@/components/integrations/calendly-embed";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import { integrations, isCalendlyEnabled } from "@/lib/integrations";

interface BookDemoSectionProps {
  variant?: "default" | "muted";
  showEmbed?: boolean;
}

export function BookDemoSection({
  variant = "muted",
  showEmbed = true,
}: BookDemoSectionProps) {
  const enabled = isCalendlyEnabled();

  if (!enabled) {
    return (
      <Section variant={variant}>
        <div className="surface-card mx-auto max-w-2xl p-8 text-center lg:p-10">
          <Calendar className="mx-auto h-8 w-8 text-brand-accent-dark" />
          <h2 className="mt-4 font-display text-2xl font-bold text-brand-primary dark:text-white">
            Book a live demo
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Tell us about your portfolio and we&apos;ll schedule a personalized walkthrough.
          </p>
          <Button variant="accent" size="lg" className="mt-6 shadow-soft" asChild>
            <Link href="/contact">
              Contact our team <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <Section variant={variant} id="book-demo">
      <SectionHeader
        eyebrow="Demo"
        title="Schedule a live walkthrough"
        description="Pick a time with our team — we'll show tours, reports, documents, and the client portal on a real project."
      />
      {showEmbed ? (
        <CalendlyEmbed url={integrations.calendlyUrl} />
      ) : (
        <div className="text-center">
          <Button variant="accent" size="lg" className="shadow-soft" asChild>
            <Link href="/contact#book-demo">
              Open scheduler <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      )}
    </Section>
  );
}
