import { Metadata } from "next";
import { Award, Eye, Target, Users, Zap } from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { StatCard } from "@/components/marketing/stat-card";
import { TrustBar } from "@/components/marketing/trust-bar";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Learn about BuildView's mission to revolutionize construction monitoring with Matterport technology and purpose-built client portals.",
  path: "/about",
});

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description:
      "Empower construction teams with remote site visibility — so decisions are made on evidence, not assumptions.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    description:
      "Every stakeholder should be able to walk any active project from anywhere, with full transparency and trust.",
  },
  {
    icon: Users,
    title: "Our Team",
    description:
      "Construction technologists, Matterport capture specialists, and software engineers united by one goal.",
  },
  {
    icon: Award,
    title: "Our Standards",
    description:
      "Enterprise-grade security, certified capture workflows, and quality-reviewed deliverables on every project.",
  },
];

const milestones = [
  { year: "2019", event: "Founded to solve remote site visibility for multi-site developers" },
  { year: "2021", event: "Launched integrated Matterport + client portal platform" },
  { year: "2023", event: "Expanded to issue tracking, documents, and timeline modules" },
  { year: "2025", event: "Serving enterprise portfolios across 12 countries" },
];

const stats = [
  { value: "500+", label: "Projects monitored" },
  { value: "2,000+", label: "Virtual tours captured" },
  { value: "150+", label: "Enterprise clients" },
  { value: "12", label: "Countries served" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Building transparency into every construction site"
        description="We bridge the gap between job sites and decision-makers through Matterport virtual tours and a purpose-built monitoring platform."
      />

      <TrustBar />

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              align="left"
              eyebrow="Our story"
              title="Born from a site-visit problem"
              description="Founded by construction and technology veterans, BuildView started with a simple observation: stakeholders spend too much time traveling to sites and not enough time making informed decisions."
              className="mb-0"
            />
            <p className="mt-6 leading-relaxed text-slate-600 dark:text-slate-400">
              We combined Matterport&apos;s industry-leading 3D capture with a monitoring platform
              designed specifically for construction — not adapted from generic project software.
              Today, developers, contractors, and consultants rely on BuildView to keep projects
              visible, documented, and on track.
            </p>
          </div>
          <div className="surface-card p-8 lg:p-10">
            <h3 className="font-display text-lg font-semibold text-brand-primary dark:text-white">
              Company milestones
            </h3>
            <ol className="mt-6 space-y-6">
              {milestones.map((item) => (
                <li key={item.year} className="flex gap-4">
                  <span className="font-display shrink-0 text-sm font-bold text-brand-accent">
                    {item.year}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.event}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="Values"
          title="What drives us"
          description="Principles that guide how we capture, deliver, and support every project."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {values.map((value) => (
            <FeatureCard key={value.title} {...value} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Impact"
          title="Trusted at scale"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} />
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
        description="Book a personalized walkthrough of the platform with our team."
        secondaryLabel="View sample projects"
        secondaryHref="/projects"
      />
    </>
  );
}
