import { Metadata } from "next";
import Image from "next/image";
import {
  Building2,
  Camera,
  ClipboardList,
  HardHat,
  Layers,
  Ruler,
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

const solution = getSolution("construction-intelligence");

export const metadata: Metadata = pageMetadata({
  title: solution.seo.title,
  description: solution.seo.description,
  path: solution.href,
});

const problems = [
  "Limited visibility into actual site conditions",
  "Frequent site visits for basic updates",
  "Communication gaps between stakeholders",
  "Difficulty comparing actual progress over time",
  "Scattered project documentation",
  "Delayed identification of site issues",
];

const audience = [
  { icon: Building2, title: "Real estate developers", description: "Portfolio visibility across active sites." },
  { icon: HardHat, title: "Construction companies", description: "Clearer reporting and site coordination." },
  { icon: Users, title: "Project managers", description: "Progress, issues, and documents in one place." },
  { icon: Ruler, title: "Architects", description: "Remote review of execution and site conditions." },
  { icon: ClipboardList, title: "Consultants", description: "Evidence-backed reviews and audits." },
  { icon: Layers, title: "Site engineers & owners", description: "Stay informed without constant travel." },
];

const workflow = [
  { step: "01", title: "Capture", description: "Record the project with professional 360° site scans." },
  { step: "02", title: "Process", description: "Prepare immersive walkthroughs for stakeholder access." },
  { step: "03", title: "Document", description: "Attach reports, photos, issues, and project files." },
  { step: "04", title: "Monitor", description: "Track updates and site conditions over time." },
  { step: "05", title: "Report", description: "Share progress with controlled client access." },
];

export default function ConstructionIntelligencePage() {
  const demoHref = contactHrefForSolution("construction");

  return (
    <>
      <ServicePageHero
        eyebrow={solution.eyebrow}
        headline="Complete Visibility Into Every Stage of Construction."
        description="Monitor, document, and understand your construction project through immersive 360° walkthroughs and intelligent project management."
        primaryCta={{
          href: demoHref,
          label: "Book a Demo",
          eventLabel: "construction_hero_demo",
        }}
        secondaryCta={{ href: "/services", label: "Explore the Platform" }}
      />

      <Section>
        <SectionHeader
          eyebrow="The challenge"
          title="Construction Projects Need More Than Traditional Site Reports."
          description="Teams still chase updates across chats, visits, and folders. Visibility suffers."
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
              title="Your Entire Construction Site. Digitally Connected."
              description="BuildView combines immersive capture with the project workspace your stakeholders already use."
              align="left"
            />
          </div>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/15">
              <Camera className="h-5 w-5 text-brand-accent-dark" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-brand-primary dark:text-white">
              360° Virtual Site Walkthroughs
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Capture entire project locations</li>
              <li>Explore spaces remotely</li>
              <li>View site conditions across capture stages</li>
              <li>Add information tags and annotations where supported</li>
              <li>Share walkthrough links with stakeholders</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/15">
              <ClipboardList className="h-5 w-5 text-brand-accent-dark" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-brand-primary dark:text-white">
              Construction Project Management
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Centralized project information</li>
              <li>Project progress documentation</li>
              <li>Visual progress tracking and timelines</li>
              <li>Reports, documents, and site photos</li>
              <li>Issue capture and resolution workflows</li>
              <li>Role-based access for project stakeholders</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Progress monitoring"
          title="Track Progress. Compare Stages. Stay Informed."
          description="Recurring 360° captures help stakeholders understand project development visually over time. BuildView supports previous vs current site views, progress documentation, visual site reporting, and remote project reviews. Automated AI progress detection is not claimed here."
        />
      </Section>

      <Section variant="muted">
        <SectionHeader eyebrow="Audience" title="Who Benefits?" />
        <BenefitsGrid items={audience} />
      </Section>

      <Section>
        <SectionHeader eyebrow="Workflow" title="Capture → Process → Document → Monitor → Report." />
        <ProcessTimeline steps={workflow} />
      </Section>

      <ServiceCtaBand
        headline="Take Control of Your Construction Visibility."
        description="Request a personalized demo of BuildView Construction Intelligence."
        primary={{
          href: demoHref,
          label: solution.demoCta,
          eventLabel: "construction_bottom_demo",
        }}
        secondary={{ href: "/contact", label: "Contact Our Team" }}
      />
    </>
  );
}
