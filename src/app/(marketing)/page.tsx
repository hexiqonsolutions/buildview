import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  Eye,
  FileStack,
  Globe2,
  Home as HomeIcon,
  MessageSquare,
  Presentation,
  Sparkles,
} from "lucide-react";
import { BenefitsGrid } from "@/components/marketing/benefits-grid";
import { HeroCaptureVideo } from "@/components/marketing/hero-capture-video";
import { HomePartnersSection } from "@/components/marketing/home-partners-section";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { SolutionCard, SolutionLinkCard } from "@/components/marketing/solution-card";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { solutions } from "@/lib/marketing/solutions";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "360° Visualization for Construction, Real Estate & Interiors",
    description: siteConfig.description,
    path: "/",
  }),
  title: {
    absolute: siteConfig.seo.title,
  },
  keywords: [
    "360 virtual walkthrough solutions",
    "immersive 360 experiences",
    "construction intelligence platform",
    "interior virtual tours",
    "real estate virtual tours",
    "BuildView",
  ],
};

const whyItems = [
  {
    icon: Eye,
    title: "Immersive Visualization",
    description: "Explore spaces in 360° with the freedom of a real walkthrough.",
  },
  {
    icon: Globe2,
    title: "Remote Accessibility",
    description: "Share experiences securely with stakeholders anywhere.",
  },
  {
    icon: MessageSquare,
    title: "Better Client Communication",
    description: "Replace scattered photos and updates with one clear experience.",
  },
  {
    icon: FileStack,
    title: "Digital Documentation",
    description: "Keep captures, reports, and project records connected where needed.",
  },
  {
    icon: Sparkles,
    title: "Interactive Experiences",
    description: "Let people navigate spaces instead of consuming static media.",
  },
  {
    icon: Presentation,
    title: "Professional Presentation",
    description: "Present projects with a premium digital first impression.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Capture",
    description:
      "Capture spaces using professional 360° cameras and compatible Matterport technology.",
  },
  {
    step: "02",
    title: "Process",
    description: "Process and prepare the captured space into an immersive virtual experience.",
  },
  {
    step: "03",
    title: "Enhance",
    description:
      "Add relevant annotations, information tags, hotspots, documentation, and other applicable features.",
  },
  {
    step: "04",
    title: "Experience",
    description:
      "Share the digital experience through a secure link or an integrated client portal.",
  },
];

const portfolioSlots = [
  {
    title: "Construction site walkthroughs",
    src: "/marketing/why-buildview/project-scans.jpg",
    alt: "Demo visual — construction site 360° capture",
  },
  {
    title: "Sample flats & property tours",
    src: "/marketing/services/compare-progress.jpg",
    alt: "Demo visual — property tour placeholder",
  },
  {
    title: "Residential interior walkthroughs",
    src: "/marketing/services/virtual-tours.jpg",
    alt: "Demo visual — interior walkthrough placeholder",
  },
  {
    title: "Commercial interior spaces",
    src: "/marketing/services/dashboard.jpg",
    alt: "Demo visual — commercial space presentation",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative -mt-18 min-h-svh overflow-hidden text-white lg:-mt-20">
        <HeroCaptureVideo />

        <div className="site-container relative z-10 flex min-h-svh flex-col justify-center pb-24 pt-28 lg:pb-28 lg:pt-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white motion-safe:animate-hero-rise md:text-5xl lg:text-6xl lg:leading-[1.05]">
              Experience Space Beyond Boundaries.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-100 motion-safe:animate-hero-rise md:text-xl [animation-delay:80ms]">
              From construction progress to real estate properties and beautifully designed
              interiors, BuildView transforms physical spaces into 360° immersive walkthrough.
            </p>
            <div className="mt-9 flex flex-col gap-3 motion-safe:animate-hero-rise sm:flex-row sm:items-center [animation-delay:240ms]">
              <Button
                variant="accent"
                size="lg"
                className="shadow-glow text-brand-primary hover:text-brand-primary"
                asChild
              >
                <TrackedLink href="#solutions" eventLabel="home_hero_explore_solutions">
                  Explore Our Solutions <ArrowRight className="h-5 w-5" />
                </TrackedLink>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/55 hover:bg-white/15 hover:text-white"
                asChild
              >
                <TrackedLink href="/contact?interest=demo" eventLabel="home_hero_book_demo">
                  Book a Demo
                </TrackedLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="Platform"
          title={
            <>
              Three Powerful Experiences.
              <br />
              One Connected Way to Work.
            </>
          }
          description="Every space has a story. Every project has progress. Every property has potential. BuildView brings these experiences together through immersive 360° technology, helping professionals showcase, and understand spaces like never before."
        />
      </Section>

      <Section id="solutions" variant="muted">
        <SectionHeader
          eyebrow="Solutions"
          title="Built for Construction, Real Estate & Interiors."
          description="All three services use 360° visualization—each solving a different customer problem."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {solutions.map((solution, index) => (
            <SolutionCard key={solution.slug} solution={solution} index={index} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="How it works"
          title="From Physical Spaces to Digital Experiences."
          description="A clear path from capture to a shareable immersive experience."
        />
        <ProcessTimeline steps={workflow} />
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="Why BuildView"
          title="More Than Just a Virtual Tour."
          description="BuildView combines 360° visualization with practical business applications for construction teams, property marketers, and design studios."
        />
        <BenefitsGrid items={whyItems} />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Industries"
          title="Where Immersive Walkthroughs Create Value."
          description="One immersive technology foundation across three industries."
        />
        <div className="grid gap-6 md:grid-cols-3">
          <SolutionLinkCard
            title="Construction & Infrastructure"
            description="Monitor sites, document progress, and keep stakeholders aligned."
            href="/construction-intelligence"
            imageSrc="/marketing/why-buildview/project-scans.jpg"
            imageAlt="Construction intelligence industry visual"
          />
          <SolutionLinkCard
            title="Real Estate & Property Development"
            description="Let buyers explore properties before they visit."
            href="/real-estate-showcase"
            imageSrc="/marketing/services/dashboard.jpg"
            imageAlt="Real estate showcase industry visual"
          />
          <SolutionLinkCard
            title="Interior Design & Architecture"
            description="Turn completed interiors into interactive digital portfolios."
            href="/interior-showcase"
            imageSrc="/marketing/services/virtual-tours.jpg"
            imageAlt="Interior showcase industry visual"
          />
        </div>
      </Section>

      <Section variant="muted" id="experiences">
        <SectionHeader
          eyebrow="Experiences"
          title="See What a Walkthrough Feels Like."
          description="Selected experience types we capture. Replace demo visuals with live project tours as they become available."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {portfolioSlots.map((slot) => (
            <figure
              key={slot.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={slot.src}
                  alt={slot.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
              </div>
              <figcaption className="space-y-1 p-4">
                <p className="text-sm font-semibold text-brand-primary dark:text-white">
                  {slot.title}
                </p>
                <p className="text-xs text-slate-500">Demo visual — replace with project tour</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/projects">
              View project gallery <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

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
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Next step
          </p>
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">
            Your Space Deserves a Better Way to Be Experienced.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Whether you&apos;re managing a construction project, showcasing an interior design, or
            marketing a property, BuildView helps you create a more immersive digital experience.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="accent" size="lg" className="shadow-glow" asChild>
              <TrackedLink href="/contact?interest=demo" eventLabel="home_bottom_book_demo">
                Book a Demo
              </TrackedLink>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/contact">
                <HomeIcon className="h-4 w-4" /> Contact Our Team
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      <HomePartnersSection />
    </>
  );
}
