import { Metadata } from "next";
import { Building2, Camera, Headphones, Shield } from "lucide-react";
import { BookDemoSection } from "@/components/marketing/book-demo-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { PricingCard, type PricingTier } from "@/components/marketing/pricing-card";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Transparent BuildView pricing for Matterport capture, progress reporting, and client portal access — from single projects to enterprise portfolios.",
  path: "/pricing",
});

const tiers: PricingTier[] = [
  {
    name: "Project",
    description: "For a single active build with remote stakeholder visibility.",
    price: "$499",
    period: "/ month",
    features: [
      "1 active project",
      "Monthly Matterport capture",
      "Progress report delivery",
      "Client portal access",
      "Document hub & issue tracking",
      "Email support",
    ],
    cta: "Start with one project",
    href: "/contact",
  },
  {
    name: "Portfolio",
    description: "For developers and PMCs managing multiple sites at once.",
    price: "$1,299",
    period: "/ month",
    features: [
      "Up to 5 active projects",
      "Bi-weekly Matterport captures",
      "Custom report templates",
      "Building & floor workspace scope",
      "Document version history",
      "Priority support",
    ],
    cta: "Talk to sales",
    href: "/contact",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    description: "For large portfolios, custom workflows, and dedicated onboarding.",
    price: "Custom",
    period: "",
    features: [
      "Unlimited projects",
      "Custom capture cadence",
      "SSO & advanced RBAC",
      "Dedicated account manager",
      "API & integration support",
      "SLA-backed uptime",
    ],
    cta: "Request enterprise quote",
    href: "/contact",
  },
];

const included = [
  {
    icon: Camera,
    title: "Matterport capture",
    description: "Professional site scans scheduled around your build programme.",
  },
  {
    icon: Shield,
    title: "Secure portals",
    description: "Role-based admin and client access with encrypted storage.",
  },
  {
    icon: Building2,
    title: "Multi-project ready",
    description: "Workspace scoping by client, project, building, and floor.",
  },
  {
    icon: Headphones,
    title: "Onboarding included",
    description: "We configure your portal, folders, and first capture workflow.",
  },
];

const faqs = [
  {
    question: "What counts as an active project?",
    answer:
      "An active project is any build currently receiving captures, reports, or portal updates. Completed projects remain accessible in the portal without counting toward your limit.",
  },
  {
    question: "Are Matterport captures included in the price?",
    answer:
      "Yes — each plan includes scheduled captures at the listed cadence. Additional ad-hoc captures can be added for urgent milestones or investor walkthroughs.",
  },
  {
    question: "Can clients access the portal without extra seats?",
    answer:
      "Client portal access is included. You can invite unlimited client users per project with role-based visibility controls.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Yes. Annual contracts receive a 15% discount and include a dedicated onboarding session for your team.",
  },
  {
    question: "What if we only need monitoring for a few months?",
    answer:
      "Project plans can run month-to-month with no long-term commitment. We'll archive deliverables when your build completes.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Plans that scale with your portfolio"
        description="Transparent pricing for Matterport monitoring, reporting, and client portal delivery — from a single tower to enterprise programmes."
      />

      <TrustBar />

      <Section>
        <SectionHeader
          eyebrow="Plans"
          title="Choose the right monitoring package"
          description="Every plan includes portal access, document management, issue tracking, and timeline modules."
        />
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} {...tier} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          All prices in USD. Capture travel outside metro areas may incur a site visit fee — we&apos;ll
          confirm before scheduling.
        </p>
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="Included"
          title="Every plan ships with the full platform"
          description="No hidden modules — tours, reports, documents, issues, and timeline are standard."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {included.map((item) => (
            <div key={item.title} className="surface-card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
                <item.icon className="h-5 w-5 text-brand-accent-dark" />
              </div>
              <h3 className="font-display font-semibold text-brand-primary dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="FAQ"
          title="Pricing questions"
          description="Common questions about plans, captures, and client access."
        />
        <FaqSection items={faqs} />
      </Section>

      <BookDemoSection />

      <PageCta
        title="Not sure which plan fits?"
        description="Tell us about your portfolio and we'll recommend capture frequency, reporting cadence, and portal setup."
        primaryLabel="Get a custom quote"
        secondaryLabel="View sample projects"
        secondaryHref="/projects"
      />
    </>
  );
}
