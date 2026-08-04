import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { ProjectShowcaseCard } from "@/components/marketing/project-showcase-card";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction Monitoring Examples",
  description:
    "Explore how BuildView supports residential, commercial, industrial, and infrastructure projects through digital construction monitoring.",
  path: "/projects",
});

const sampleProjects = [
  {
    name: "Navi Mumbai Commercial Tower",
    client: "Meridian Development",
    location: "Navi Mumbai, India",
    status: "In Progress" as const,
    type: "Commercial",
    description:
      "32-story commercial tower with retail podium and underground parking — monitored across 8 capture cycles.",
    tours: 8,
    reports: 12,
  },
  {
    name: "Pacific Heights Residence",
    client: "Luxury Homes Inc.",
    location: "San Francisco, CA",
    status: "In Progress" as const,
    type: "Residential",
    description:
      "Luxury 4-story residential development with panoramic bay views and high-spec interior milestones.",
    tours: 5,
    reports: 8,
  },
  {
    name: "Riverside Industrial Park",
    client: "Apex Logistics",
    location: "Austin, TX",
    status: "Completed" as const,
    type: "Industrial",
    description:
      "500,000 sq ft warehouse and distribution facility — full digital handover record delivered.",
    tours: 15,
    reports: 24,
  },
  {
    name: "Downtown Metro Station",
    client: "City Infrastructure Authority",
    location: "Seattle, WA",
    status: "Planning" as const,
    type: "Infrastructure",
    description:
      "Underground metro station with pedestrian concourse and retail spaces — pre-construction baseline established.",
    tours: 2,
    reports: 3,
  },
  {
    name: "Harbor View Hotel",
    client: "Coastal Hospitality Group",
    location: "Miami, FL",
    status: "In Progress" as const,
    type: "Hospitality",
    description:
      "12-story waterfront hotel with ballroom and spa wing — investor visibility via monthly virtual tour captures.",
    tours: 6,
    reports: 9,
  },
  {
    name: "Greenfield Data Center",
    client: "CloudScale Infrastructure",
    location: "Phoenix, AZ",
    status: "In Progress" as const,
    type: "Industrial",
    description:
      "Mission-critical data center build with MEP-heavy milestones tracked through issue and report workflows.",
    tours: 4,
    reports: 7,
  },
];

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="Construction Projects We've Helped Monitor"
        description="Explore how BuildView supports residential, commercial, industrial, and infrastructure projects through digital construction monitoring."
      />

      <TrustBar />

      <Section>
        <SectionHeader
          eyebrow="Construction Monitoring Examples"
          title="Real monitoring scenarios across sectors"
          description="Each example shows how virtual tours, progress reports, documents, and issue tracking come together in one platform."
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {sampleProjects.map((project) => (
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
            <Link href="/contact">
              Book Live Demo <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </Section>

      <PageCta
        title="Want BuildView on Your Next Project?"
        description="Let's discuss your project size, monitoring requirements, and reporting schedule."
        primaryLabel="Book a Demo"
        secondaryLabel="Explore services"
        secondaryHref="/services"
      />
    </>
  );
}
