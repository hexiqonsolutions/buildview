import Link from "next/link";
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
  Shield,
  Users,
} from "lucide-react";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HeroCaptureVideo } from "@/components/marketing/hero-capture-video";
import { LifecycleTimeline } from "@/components/marketing/lifecycle-timeline";
import { ProductModuleCard } from "@/components/marketing/product-module-card";
import { RoleCard } from "@/components/marketing/role-card";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { StatCard } from "@/components/marketing/stat-card";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { TrustBar } from "@/components/marketing/trust-bar";
import { Button } from "@/components/ui/button";

const metrics = [
  { value: "50%", label: "Fewer physical site visits with remote Matterport walkthroughs" },
  { value: "3×", label: "Faster issue handoffs between field teams and stakeholders" },
  { value: "70%", label: "Less time spent compiling progress documentation" },
  { value: "24/7", label: "Secure portal access to tours, reports, and project files" },
];

const products = [
  {
    icon: Camera,
    title: "Virtual Tours",
    description:
      "Immersive Matterport 360° captures that let anyone walk the site from their desk or phone.",
    highlights: [
      "Embedded Matterport viewer in every project",
      "Time-stamped captures on the timeline",
      "Shareable links for investors and consultants",
    ],
    href: "/services#virtual-tours",
    featured: true,
  },
  {
    icon: FileText,
    title: "Progress Reports",
    description:
      "Structured PDF reports with photos, milestones, and metrics — delivered on your schedule.",
    highlights: [
      "Versioned report history per project",
      "Download and preview in-browser",
      "Aligned with timeline milestones",
    ],
    href: "/services#reports",
    featured: false,
  },
  {
    icon: Clock,
    title: "Project Timeline",
    description:
      "A visual record of every capture, milestone, and site event across the build lifecycle.",
    highlights: [
      "Chronological photo galleries",
      "Tour embeds at each checkpoint",
      "Filter by date and event type",
    ],
    href: "/services#timeline",
    featured: false,
  },
  {
    icon: FolderOpen,
    title: "Document Hub",
    description:
      "Drawings, BOQs, contracts, and approvals organized in folders your whole team can access.",
    highlights: [
      "Folder-based structure per project",
      "Secure download controls",
      "Admin-managed uploads",
    ],
    href: "/services#documents",
    featured: false,
  },
  {
    icon: AlertTriangle,
    title: "Issue Tracking",
    description:
      "Log defects and snags with priority, photos, assignments, and resolution workflows.",
    highlights: [
      "Priority and status workflows",
      "Photo attachments per issue",
      "Client-visible issue dashboard",
    ],
    href: "/services#issues",
    featured: false,
  },
];

const roles = [
  {
    icon: Briefcase,
    title: "Project Managers",
    description: "Keep every stakeholder aligned with one source of truth for site progress.",
  },
  {
    icon: Building2,
    title: "Developers & Owners",
    description: "Give investors and leadership remote visibility without constant site travel.",
  },
  {
    icon: HardHat,
    title: "General Contractors",
    description: "Document field conditions, track snags, and close issues with visual proof.",
  },
  {
    icon: Ruler,
    title: "Architects & Designers",
    description: "Compare as-built conditions against design intent at every milestone.",
  },
  {
    icon: Users,
    title: "Consultants & PMCs",
    description: "Audit progress, verify compliance, and report across multiple projects.",
  },
  {
    icon: Shield,
    title: "Safety & QA Teams",
    description: "Capture evidence, flag risks early, and maintain a clear audit trail.",
  },
];

const lifecyclePhases = [
  {
    phase: "Planning",
    title: "Set the baseline",
    description:
      "Establish project structure, upload pre-construction documents, and schedule your first Matterport capture before ground breaks.",
  },
  {
    phase: "Execution",
    title: "Monitor in motion",
    description:
      "Regular scans, progress reports, issue logging, and timeline updates keep every phase visible to remote stakeholders.",
  },
  {
    phase: "Handover",
    title: "Close with clarity",
    description:
      "Deliver a complete digital record — tours, reports, documents, and resolved issues — ready for handover and warranty.",
  },
];

const industries = [
  { name: "Residential", icon: Building2 },
  { name: "Commercial", icon: Layers },
  { name: "Industrial", icon: HardHat },
  { name: "Infrastructure", icon: Shield },
];

const testimonials = [
  {
    quote:
      "BuildView transformed how we monitor our projects. The Matterport tours save us countless site visits.",
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

const processSteps = [
  {
    step: "01",
    title: "Capture",
    description: "Matterport 3D scan of your active site, scheduled around your build programme.",
  },
  {
    step: "02",
    title: "Process",
    description: "We compile tours, reports, documents, and timeline entries into your portal.",
  },
  {
    step: "03",
    title: "Review",
    description: "Quality-checked deliverables ready for your team, clients, and investors.",
  },
  {
    step: "04",
    title: "Deliver",
    description: "Secure access through the BuildView client dashboard — anytime, anywhere.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero — split layout */}
      <section className="mesh-gradient relative overflow-hidden text-white">
        <div className="dot-pattern absolute inset-0 opacity-40" />
        <div className="site-container relative pb-16 pt-12 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-in">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
                Construction visibility platform
              </p>
              <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
                See your site clearly.{" "}
                <span className="gradient-text">Decide faster.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
                BuildView combines Matterport virtual tours, progress reports, document
                management, and issue tracking in one professional client portal.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button variant="accent" size="lg" className="shadow-glow" asChild>
                  <Link href="/contact">
                    Book a Demo <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/projects">
                    <Play className="h-5 w-5" /> View Sample Project
                  </Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                {["Matterport integrated", "Enterprise-ready", "Dedicated onboarding"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-accent" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="animate-slide-up">
              <HeroCaptureVideo />
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      {/* Metrics */}
      <Section variant="muted" className="!py-16 md:!py-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </Section>

      {/* Product modules */}
      <Section id="platform">
        <SectionHeader
          eyebrow="Platform"
          title="One portal for complete site visibility"
          description="Every capability your project needs — from immersive walkthroughs to structured reporting — unified in a single client experience."
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

      {/* How it works */}
      <Section variant="muted">
        <SectionHeader
          eyebrow="Process"
          title="From capture to client delivery"
          description="A streamlined workflow designed for construction teams — no complex setup, no fragmented tools."
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((item, index) => (
            <div key={item.step} className="relative text-center lg:text-left">
              {index < processSteps.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-7 hidden h-px w-[calc(100%-4rem)] bg-brand-accent/25 lg:block" />
              )}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl accent-gradient font-display text-lg font-bold text-brand-primary lg:mx-0">
                {item.step}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-brand-primary dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Built for roles */}
      <Section>
        <SectionHeader
          eyebrow="Built for"
          title="The people who move projects forward"
          description="Whether you build, design, own, or oversee — BuildView gives your role the visibility it needs."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.title} {...role} />
          ))}
        </div>
      </Section>

      {/* Lifecycle */}
      <Section variant="muted">
        <SectionHeader
          eyebrow="Lifecycle"
          title="Support for every construction phase"
          description="From pre-construction planning through handover — your digital site record grows with the project."
        />
        <LifecycleTimeline phases={lifecyclePhases} />
      </Section>

      {/* Industries */}
      <Section>
        <SectionHeader
          eyebrow="Industries"
          title="Built for complex builds across sectors"
          description="Residential towers to infrastructure — the same platform scales with your portfolio."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="surface-card flex flex-col items-center p-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10">
                <industry.icon className="h-5 w-5 text-brand-accent-dark" />
              </div>
              <p className="font-display font-semibold text-brand-primary dark:text-white">
                {industry.name}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Platform highlights grid */}
      <Section variant="muted">
        <SectionHeader
          eyebrow="Why BuildView"
          title="Professional monitoring without the complexity"
          description="Purpose-built for construction — not a generic project tool with a camera bolted on."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Camera}
            title="Matterport-native"
            description="Tours embedded directly in projects — not external links lost in email threads."
          />
          <FeatureCard
            icon={Shield}
            title="Secure by design"
            description="Role-based access, encrypted storage, and client-specific project isolation."
          />
          <FeatureCard
            icon={Layers}
            title="Portfolio-ready"
            description="Manage multiple projects and clients from a single admin control panel."
          />
        </div>
      </Section>

      {/* Testimonials */}
      <Section>
        <SectionHeader
          eyebrow="Testimonials"
          title="Trusted by construction leaders"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.author} {...t} />
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="accent" className="relative overflow-hidden">
        <div className="dot-pattern absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">
            Ready to modernize your construction monitoring?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Join developers, contractors, and architects who use BuildView for remote
            project visibility.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="accent" size="lg" className="shadow-glow" asChild>
              <Link href="/contact">Get Started Today</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            {["Free 14-day trial", "No credit card required", "Dedicated onboarding"].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-accent" />
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </Section>
      <JsonLd />
    </>
  );
}
