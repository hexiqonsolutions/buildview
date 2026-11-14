import Image from "next/image";
import { Metadata } from "next";
import {
  Briefcase,
  Home,
  LayoutTemplate,
  Share2,
  Sparkles,
  Star,
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

const solution = getSolution("interior-showcase");

export const metadata: Metadata = pageMetadata({
  title: solution.seo.title,
  description: solution.seo.description,
  path: solution.href,
});

const benefits = [
  {
    icon: LayoutTemplate,
    title: "Interactive Digital Portfolio",
    description: "Present your work through immersive virtual experiences.",
  },
  {
    icon: Sparkles,
    title: "Better Client Presentations",
    description: "Let prospective customers experience previous projects.",
  },
  {
    icon: Home,
    title: "Showcase Design Details",
    description: "Present rooms, finishes, layouts, and interior elements.",
  },
  {
    icon: Share2,
    title: "Easy Project Sharing",
    description: "Share your portfolio using a secure link.",
  },
  {
    icon: Star,
    title: "Stand Out From Competitors",
    description: "Differentiate your studio with modern presentation technology.",
  },
  {
    icon: Briefcase,
    title: "Build Client Confidence",
    description: "Give a more realistic understanding of your design capabilities.",
  },
];

const categories = [
  "Luxury Residential Interiors",
  "Modern Apartments",
  "Living Room Designs",
  "Modular Kitchens",
  "Commercial Offices",
  "Retail Interiors",
  "Hotels and Hospitality",
];

const idealFor = [
  "Interior designers",
  "Interior design studios",
  "Architects",
  "Residential interior contractors",
  "Commercial interior designers",
  "Hospitality designers",
  "Furniture and space planning studios",
];

const workflow = [
  { step: "01", title: "Select", description: "Choose your completed project." },
  { step: "02", title: "Capture", description: "BuildView captures the space using 360° technology." },
  { step: "03", title: "Process", description: "The walkthrough is prepared for interactive viewing." },
  { step: "04", title: "Deliver", description: "Receive a shareable virtual experience." },
  { step: "05", title: "Showcase", description: "Present it to prospective clients." },
];

export default function InteriorShowcasePage() {
  const demoHref = contactHrefForSolution("interior");

  return (
    <>
      <ServicePageHero
        eyebrow={solution.eyebrow}
        headline="Your Designs Deserve to Be Experienced, Not Just Seen."
        description="Transform your completed interior projects into interactive 360° walkthroughs. Let clients explore every room, corner, and design detail through an immersive digital portfolio."
        primaryCta={{
          href: "/projects",
          label: "View a Sample Experience",
          eventLabel: "interior_hero_sample",
        }}
        secondaryCta={{ href: demoHref, label: "Showcase Your Projects" }}
      />

      <Section>
        <SectionHeader
          eyebrow="The challenge"
          title="Photos Show the Design. Walkthroughs Show the Experience."
          description="Interior teams often share hundreds of photographs, video clips, reels, and PDF portfolios. Static media cannot offer the same freedom of exploration as an interactive virtual walkthrough."
        />
      </Section>

      <Section variant="muted">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Our solution"
              title="Turn Every Completed Project Into an Interactive Experience."
              description="BuildView captures completed interior spaces using professional 360° technology and transforms them into interactive digital walkthroughs. Clients can explore from desktop, tablet, or mobile."
              align="left"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 shadow-soft dark:border-slate-800">
            <Image
              src="/marketing/services/virtual-tours.jpg"
              alt="Placeholder visual for interior 360° showcase — replace with studio project photography"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Benefits" title="What Your Studio Gains." />
        <BenefitsGrid items={benefits} />
      </Section>

      <Section variant="muted">
        <SectionHeader eyebrow="Ideal for" title="Who This Service Is For" />
        <div className="flex flex-wrap gap-2.5">
          {idealFor.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Categories"
          title="Spaces We Capture."
          description="Image-led gallery categories. Replace placeholders with your completed project photography."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((label, i) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={
                    i % 2 === 0
                      ? "/marketing/services/virtual-tours.jpg"
                      : "/marketing/why-buildview/reports.jpg"
                  }
                  alt={`Placeholder for ${label}`}
                  fill
                  className="object-cover opacity-70"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <p className="absolute bottom-4 left-4 right-4 font-display text-base font-semibold text-white">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader eyebrow="Process" title="How It Works" />
        <ProcessTimeline steps={workflow} />
      </Section>

      <ServiceCtaBand
        headline="Make Your Portfolio an Experience."
        description="Give your clients the freedom to explore your work before they decide to work with you."
        primary={{
          href: demoHref,
          label: "Create Your Virtual Portfolio",
          eventLabel: "interior_bottom_cta",
        }}
      />
    </>
  );
}
