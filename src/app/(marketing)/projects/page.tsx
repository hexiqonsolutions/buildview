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

  title: "Projects",

  description:

    "Explore sample construction projects monitored by BuildView with Matterport virtual tours, reports, and client portal access.",

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

      "12-story waterfront hotel with ballroom and spa wing — investor visibility via monthly Matterport captures.",

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

        eyebrow="Portfolio"

        title="Sample projects across sectors"

        description="See how BuildView delivers remote construction monitoring for commercial, residential, industrial, and infrastructure builds."

      />



      <TrustBar />



      <Section>

        <SectionHeader

          eyebrow="Case studies"

          title="Real monitoring scenarios"

          description="Each project includes Matterport tours, progress reports, and portal access tailored to stakeholder needs."

        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">

          {sampleProjects.map((project) => (

            <ProjectShowcaseCard key={project.name} {...project} />

          ))}

        </div>

      </Section>



      <Section variant="muted">

        <div className="surface-card mx-auto max-w-3xl p-8 text-center lg:p-12">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent/10">

            <LayoutDashboard className="h-7 w-7 text-brand-accent-dark" />

          </div>

          <h2 className="mt-5 font-display text-2xl font-bold text-brand-primary dark:text-white">

            Client portal preview

          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">

            Sign in to explore the full dashboard — virtual tours, compare views, reports,

            documents with version history, issues, and timeline for assigned projects.

          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

            <Button variant="accent" size="lg" className="shadow-soft" asChild>

              <Link href="/login">

                Sign in to portal <ArrowRight className="h-5 w-5" />

              </Link>

            </Button>

            <Button variant="outline" size="lg" asChild>

              <Link href="/contact">Request demo access</Link>

            </Button>

          </div>

        </div>

      </Section>



      <PageCta

        title="Want BuildView on your next project?"

        description="We'll scope capture frequency, reporting cadence, and portal setup for your portfolio."

        primaryLabel="Request a quote"

        secondaryLabel="View pricing"

        secondaryHref="/pricing"

      />

    </>

  );

}


