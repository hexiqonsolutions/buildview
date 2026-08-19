import { Metadata } from "next";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { ProjectShowcaseCard } from "@/components/marketing/project-showcase-card";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { ViewContentTracker } from "@/components/analytics/view-content-tracker";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction Monitoring Use Cases",
  description:
    "See how BuildView supports residential, commercial, industrial, and infrastructure projects through 360° site tours, progress reports, documents and issue tracking.",
  path: "/projects",
});

const projectUseCases = [
  {
    name: "Commercial towers",
    client: "Developers, PMCs, and consultants",
    location: "Multi-floor progress and remote reviews",
    status: "In Progress" as const,
    type: "Commercial",
    description:
      "Give stakeholders a floor-by-floor visual record so tower progress can be reviewed without waiting on scattered site photos.",
  },
  {
    name: "Residential developments",
    client: "Developers and project owners",
    location: "Plot, wing, and interior milestone visibility",
    status: "In Progress" as const,
    type: "Residential",
    description:
      "Keep owners and internal teams aligned with repeatable 360° captures, progress reports, and documented issues.",
  },
  {
    name: "Industrial facilities",
    client: "Contractors and project owners",
    location: "Large-footprint site documentation",
    status: "In Progress" as const,
    type: "Industrial",
    description:
      "Document warehouses, plants, and MEP-heavy builds with a shared visual record, drawings, and issue trails.",
  },
  {
    name: "Infrastructure works",
    client: "Consultants, PMCs, and owners",
    location: "Corridor and checkpoint monitoring",
    status: "Planning" as const,
    type: "Infrastructure",
    description:
      "Create a dated site record for civil works so reviews, audits, and progress conversations use the same evidence.",
  },
  {
    name: "Hospitality projects",
    client: "Developers and architects",
    location: "Interior and common-area progress",
    status: "In Progress" as const,
    type: "Hospitality",
    description:
      "Let design and delivery teams review execution remotely as rooms, public areas, and finishes move forward.",
  },
  {
    name: "Specialized facilities",
    client: "Owners, consultants, and contractors",
    location: "Technical milestone documentation",
    status: "In Progress" as const,
    type: "Specialized",
    description:
      "Combine 360° walkthroughs, reports, and issue tracking where coordination and documentation matter as much as photos.",
  },
];

export default function ProjectsPage() {
  return (
    <>
      <ViewContentTracker contentName="projects" contentCategory="product" />
      <PageHero
        eyebrow="Projects"
        title="Construction Monitoring Across Project Types"
        description="BuildView is used to give developers, architects, contractors, PMCs, and project owners a visual record of construction progress—without treating every project as a photography assignment."
      />

      <TrustBar />

      <Section>
        <SectionHeader
          eyebrow="Use cases"
          title="Where construction visibility matters"
          description="These are typical monitoring scenarios—not invented client case studies. Live project examples are shown in a demo."
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {projectUseCases.map((project) => (
            <ProjectShowcaseCard key={project.name} {...project} />
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <div className="surface-card flex flex-col items-start gap-6 p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="max-w-2xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
              <LayoutDashboard className="h-5 w-5 text-brand-accent-dark" />
            </div>
            <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white">
              Prefer a live walkthrough?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Book a demo and we&apos;ll show how BuildView monitors progress across your project
              size, reporting schedule, and stakeholder roles.
            </p>
          </div>
          <Button variant="accent" size="lg" className="shrink-0 shadow-soft" asChild>
            <TrackedLink href="/contact" eventLabel="projects_book_demo">
              Book Live Demo <ArrowRight className="h-5 w-5" />
            </TrackedLink>
          </Button>
        </div>
      </Section>

      <PageCta
        title="Want BuildView on Your Next Project?"
        description="Tell us about your project size, monitoring requirements, and reporting schedule."
        primaryLabel="Book a Demo"
        secondaryLabel="Explore services"
        secondaryHref="/services"
      />
    </>
  );
}
