import Link from "next/link";
import { Metadata } from "next";
import { JsonLd } from "@/components/integrations/json-ld";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  HardHat,
  Layers,
  Play,
  Ruler,
  Users,
} from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HeroCaptureVideo } from "@/components/marketing/hero-capture-video";
import { ProductModuleCard } from "@/components/marketing/product-module-card";
import { RoleCard } from "@/components/marketing/role-card";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { TrustBar } from "@/components/marketing/trust-bar";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Construction Monitoring Software",
    description:
      "Monitor construction projects with 360° virtual site tours, progress reports, document management, issue tracking, and timelines. Built for developers, architects, contractors, and PMCs.",
    path: "/",
  }),
  title: {
    absolute:
      "Construction Monitoring Software | BuildView Construction Intelligence Platform",
  },
};

const products = [
  {
    icon: Camera,
    title: "Virtual Tours",
    description:
      "Walk through your project from anywhere using immersive 360° site captures.",
    highlights: [
      "Professional 360° digital twins",
      "Remote stakeholder walkthroughs",
      "Historical site documentation",
    ],
    href: "/services#virtual-tours",
    featured: true,
  },
  {
    icon: FileText,
    title: "Progress Reports",
    description:
      "Generate professional construction reports with milestones, observations, and progress summaries.",
    highlights: [
      "Consistent project updates",
      "Executive-ready PDF deliverables",
      "Aligned with site milestones",
    ],
    href: "/services#reports",
    featured: false,
  },
  {
    icon: Clock,
    title: "Timeline",
    description:
      "Track every milestone and construction activity through an interactive project timeline.",
    highlights: [
      "Chronological site history",
      "Photos, tours, and notes together",
      "Clear progress checkpoints",
    ],
    href: "/services#timeline",
    featured: false,
  },
  {
    icon: FolderOpen,
    title: "Documents",
    description:
      "Keep drawings, BOQs, contracts, and technical documents organized and accessible.",
    highlights: [
      "Secure project repository",
      "Folder-based organization",
      "Controlled stakeholder access",
    ],
    href: "/services#documents",
    featured: false,
  },
  {
    icon: AlertTriangle,
    title: "Issues",
    description:
      "Capture, assign, and resolve construction issues before they impact delivery.",
    highlights: [
      "Photo-backed observations",
      "Ownership and status workflows",
      "Audit-ready resolution trail",
    ],
    href: "/services#issues",
    featured: false,
  },
];

const roles = [
  {
    icon: Building2,
    title: "Developers",
    description: "Monitor multiple projects with complete portfolio visibility.",
  },
  {
    icon: Ruler,
    title: "Architects",
    description: "Review execution, drawings, and site progress remotely.",
  },
  {
    icon: HardHat,
    title: "Contractors",
    description: "Simplify reporting, documentation, and communication.",
  },
  {
    icon: Briefcase,
    title: "Project Management Consultants",
    description: "Track quality, milestones, and issue resolution from one dashboard.",
  },
  {
    icon: Users,
    title: "Project Owners",
    description: "Stay informed without visiting the site.",
  },
  {
    icon: Layers,
    title: "Consultants",
    description: "Access the evidence you need for reviews, audits, and decisions.",
  },
];

const processSteps = [
  {
    step: "01",
    title: "Capture",
    description: "Record your project with professional 360° site scans.",
  },
  {
    step: "02",
    title: "Monitor",
    description: "Track progress, reports, issues, and documents in one place.",
  },
  {
    step: "03",
    title: "Review",
    description: "Collaborate with architects, consultants, and contractors.",
  },
  {
    step: "04",
    title: "Deliver",
    description: "Complete projects with complete transparency and organized documentation.",
  },
];

const testimonials = [
  {
    quote:
      "BuildView transformed how we monitor our projects. The virtual tours save us countless site visits.",
    author: "Sarah Chen",
    role: "Project Director, Meridian Development",
  },
  {
    quote:
      "Our investors love the transparency. They can walk through the site virtually and see real progress.",
    author: "Michael Torres",
    role: "CEO, Apex Construction Group",
  },
  {
    quote:
      "Issue tracking and document management in one platform is exactly what our team needed.",
    author: "Priya Sharma",
    role: "Senior Architect, Design Collective",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative -mt-[4.5rem] min-h-svh overflow-hidden text-white lg:-mt-20">
        <HeroCaptureVideo />

        <div className="site-container relative z-10 flex min-h-svh flex-col justify-center pb-24 pt-28 lg:pb-28 lg:pt-32">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent backdrop-blur-sm motion-safe:animate-hero-rise">
              Construction Intelligence Platform
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white motion-safe:animate-hero-rise md:text-5xl lg:text-6xl lg:leading-[1.05] [animation-delay:80ms]">
              See Every Construction Project.
              <span className="mt-1 block text-white">Make Every Decision Faster.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-100 motion-safe:animate-hero-rise md:text-xl [animation-delay:160ms]">
              BuildView brings together virtual site tours, construction progress tracking,
              reports, document management, issue tracking, and project timelines into one
              intelligent platform—so your team always knows what&apos;s happening on site without
              chasing updates.
            </p>
            <div className="mt-9 flex flex-col gap-3 motion-safe:animate-hero-rise sm:flex-row sm:items-center [animation-delay:240ms]">
              <Button
                variant="accent"
                size="lg"
                className="shadow-glow text-brand-primary hover:text-brand-primary"
                asChild
              >
                <Link href="/contact">
                  Book Live Demo <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/55 hover:bg-white/15 hover:text-white"
                asChild
              >
                <Link href="/services">
                  <Play className="h-5 w-5" /> Explore Platform
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      <Section id="platform">
        <SectionHeader
          eyebrow="Platform"
          title="One Platform. Complete Site Visibility."
          description="From the first excavation to final handover, BuildView gives every stakeholder real-time visibility into construction progress, project documentation, and site activity."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {products.slice(0, 3).map((product) => (
            <ProductModuleCard key={product.title} {...product} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {products.slice(3).map((product) => (
            <ProductModuleCard key={product.title} {...product} />
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="Workflow"
          title="From Site Capture to Project Delivery"
          description="A clear operating model for construction monitoring—capture once, keep every stakeholder aligned."
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {processSteps.map((item, index) => (
            <div key={item.step} className="relative text-center lg:text-left">
              {index < processSteps.length - 1 && (
                <div className="absolute left-[calc(50%+2.25rem)] top-7 hidden h-px w-[calc(100%-4.5rem)] bg-slate-200 dark:bg-slate-700 lg:block" />
              )}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient font-display text-lg font-bold text-brand-primary shadow-soft lg:mx-0">
                {item.step}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-brand-primary dark:text-white">
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
          eyebrow="Users"
          title="Built for Every Construction Team"
          description="Whether you develop, design, build, consult, or own—BuildView gives your role the visibility it needs."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.title} {...role} />
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="Why BuildView"
          title="Professional construction monitoring without the complexity"
          description="Purpose-built for construction visibility—not a generic project tool with a camera bolted on."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Camera}
            title="360°-native virtual tours"
            description="Immersive site captures embedded in the platform for remote inspections and stakeholder reviews."
          />
          <FeatureCard
            icon={FileText}
            title="Reports, docs, and issues together"
            description="Progress tracking, documentation, and issue resolution live in one construction intelligence workspace."
          />
          <FeatureCard
            icon={CheckCircle2}
            title="Role-based client access"
            description="Give every stakeholder controlled visibility without chasing updates across emails and chats."
          />
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Testimonials" title="Trusted by construction leaders" />
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.author} {...t} />
          ))}
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
            Ready to Modernize Construction Monitoring?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Book a personalized demonstration and discover how BuildView improves project
            visibility and decision-making.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="accent" size="lg" className="shadow-glow" asChild>
              <Link href="/contact">Book Live Demo</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/projects">View Projects</Link>
            </Button>
          </div>
        </div>
      </Section>
      <JsonLd />
    </>
  );
}
