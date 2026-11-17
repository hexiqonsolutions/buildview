import Image from "next/image";
import { Metadata } from "next";
import {
  Building,
  Globe2,
  Home,
  MapPinned,
  Presentation,
  Users,
} from "lucide-react";
import { BenefitsGrid } from "@/components/marketing/benefits-grid";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { ServiceCtaBand } from "@/components/marketing/service-cta-band";
import { ServicePageHero } from "@/components/marketing/service-page-hero";
import {
  contactHrefForSolution,
  getSolution,
} from "@/lib/marketing/solutions";
import { pageMetadata } from "@/lib/seo";

const solution = getSolution("real-estate-showcase");

export const metadata: Metadata = pageMetadata({
  title: solution.seo.title,
  description: solution.seo.description,
  path: solution.href,
});

const benefits = [
  {
    icon: Home,
    title: "Virtual Property Tours",
    description: "Allow buyers to explore properties remotely.",
  },
  {
    icon: Presentation,
    title: "Better Property Presentation",
    description: "Showcase the complete property rather than selected photographs.",
  },
  {
    icon: Globe2,
    title: "Remote Buyer Engagement",
    description: "Reach customers who cannot immediately visit the location.",
  },
  {
    icon: Building,
    title: "Sample Flat Showcase",
    description: "Present model apartments and furnished sample flats.",
  },
  {
    icon: Users,
    title: "Sales Team Support",
    description: "Give sales teams a visual tool for property presentations.",
  },
  {
    icon: MapPinned,
    title: "Website Integration",
    description: "Embed virtual experiences into compatible project websites and landing pages.",
  },
];

const problems = [
  "Buyers want to understand the complete property before visiting",
  "Photographs show selected views only",
  "Conventional videos offer limited exploration",
  "Remote buyers need better property presentation",
  "Sales teams spend time explaining spaces repeatedly",
];

const workflow = [
  { step: "01", title: "Property Selection", description: "Choose the property or sample flat to capture." },
  { step: "02", title: "Professional 360° Capture", description: "Capture the space with professional 360° technology." },
  { step: "03", title: "Virtual Tour Processing", description: "Prepare an interactive digital property experience." },
  { step: "04", title: "Digital Presentation", description: "Ready the tour for sales and marketing use." },
  { step: "05", title: "Share", description: "Share with buyers, investors, and project websites." },
];

export default function RealEstateShowcasePage() {
  const demoHref = contactHrefForSolution("real-estate");

  return (
    <>
      <ServicePageHero
        eyebrow={solution.eyebrow}
        headline="Let Your Buyers Experience the Property Before Visiting."
        description="Showcase residential and commercial properties through immersive 360° virtual walkthroughs. Give buyers and investors a better way to explore properties remotely."
        primaryCta={{
          href: "/projects",
          label: "View a Sample Property Tour",
          eventLabel: "realestate_hero_sample",
        }}
        secondaryCta={{ href: demoHref, label: "Request a Demo" }}
      />

      <Section>
        <SectionHeader
          eyebrow="The challenge"
          title="Property Marketing Needs More Than Photographs."
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {problems.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-soft dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section variant="muted">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative order-2 aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 shadow-soft dark:border-slate-800 lg:order-1">
            <Image
              src={solution.imageSrc}
              alt={solution.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeader
              eyebrow="Our solution"
              title="Bring Your Properties to Life With 360° Virtual Tours."
              description="BuildView captures real estate spaces using 360° technology and creates interactive virtual experiences. Potential customers can navigate the property, understand its layout, and explore before arranging an in-person visit."
              align="left"
            />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Benefits" title="What Your Sales Team Gains." />
        <BenefitsGrid items={benefits} />
      </Section>

      <Section>
        <SectionHeader eyebrow="Process" title="How It Works" />
        <ProcessTimeline steps={workflow} />
      </Section>

      <ServiceCtaBand
        headline="Give Every Property a Digital First Impression."
        description="Request a property showcase demo for your next launch or sample flat."
        primary={{
          href: demoHref,
          label: "Showcase Your Property",
          eventLabel: "realestate_bottom_cta",
        }}
      />
    </>
  );
}
