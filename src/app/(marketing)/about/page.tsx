import { Metadata } from "next";
import { Eye, Handshake, Shield, Sparkles, Target, Zap } from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About BuildView",
  description:
    "BuildView makes construction projects transparent, accessible, and data-driven with virtual site tours, progress tracking, and stakeholder collaboration.",
  path: "/about",
});

const values = [
  {
    icon: Eye,
    title: "Transparency",
    description:
      "Every stakeholder deserves clear visibility into site progress without chasing updates.",
  },
  {
    icon: Handshake,
    title: "Collaboration",
    description:
      "Developers, contractors, architects, and consultants work from one shared source of truth.",
  },
  {
    icon: Target,
    title: "Accuracy",
    description:
      "Time-stamped captures, structured reports, and issue trails reduce guesswork in decisions.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    description:
      "Digital twins and construction intelligence replace fragmented photos, calls, and spreadsheets.",
  },
  {
    icon: Shield,
    title: "Reliability",
    description:
      "Secure access, organized documentation, and consistent delivery across every project.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Building Transparency Into Every Construction Project."
        description="BuildView was created to solve one of construction's biggest challenges—keeping every stakeholder informed without depending on endless calls, messages, and site visits."
      />

      <TrustBar />

      <Section>
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            align="left"
            eyebrow="Our story"
            title="Construction Projects Deserve Better Visibility"
            description="Construction teams often spend more time collecting updates than making decisions."
            className="mb-0"
          />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            <p>Drawings are scattered. Reports arrive late. Clients request progress photos.</p>
            <p>
              Engineers spend valuable time preparing documentation instead of managing execution.
            </p>
            <p>
              BuildView centralizes everything into one intelligent platform designed specifically
              for construction projects.
            </p>
          </div>
        </div>
      </Section>

      <Section variant="muted">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Mission
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-brand-primary dark:text-white">
              To make every construction project transparent, accessible, and data-driven.
            </h2>
          </div>
          <div className="surface-card p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Vision
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-brand-primary dark:text-white">
              A future where every construction project has a live digital twin that anyone can
              access securely from anywhere.
            </h2>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Core values"
          title="What drives BuildView"
          description="Principles that guide how we capture, deliver, and support every construction project."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <FeatureCard key={value.title} {...value} />
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <div className="surface-card mx-auto max-w-3xl p-8 text-center lg:p-12">
          <Zap className="mx-auto h-8 w-8 text-brand-accent" />
          <blockquote className="mt-4 font-display text-xl font-semibold leading-relaxed text-brand-primary dark:text-white md:text-2xl">
            &ldquo;If the whole construction project can be shown digitally and available at your
            fingertips, the possibilities for better decisions are immense.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-slate-500">— BuildView founding team</p>
        </div>
      </Section>

      <PageCta
        title="See how BuildView works on a real project"
        description="Book a personalized demonstration and discover how BuildView improves project visibility and decision-making."
        secondaryLabel="Explore services"
        secondaryHref="/services"
      />
    </>
  );
}
