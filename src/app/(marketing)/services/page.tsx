import { Metadata } from "next";
import {
  AlertTriangle,
  Camera,
  Clock,
  FileText,
  FolderOpen,
  GitCompareArrows,
  LayoutDashboard,
} from "lucide-react";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageCta } from "@/components/marketing/page-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { ServiceSection } from "@/components/marketing/service-section";
import { TrustBar } from "@/components/marketing/trust-bar";
import { ViewContentTracker } from "@/components/analytics/view-content-tracker";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction Monitoring Services",
  description:
    "Construction monitoring with 360° virtual site tours, progress reports, timelines, document management, issue tracking, and role-based client dashboards.",
  path: "/services",
});

const services = [
  {
    id: "virtual-tours",
    icon: Camera,
    title: "360° Virtual Site Tours",
    description:
      "Immersive site captures for remote inspections and stakeholder reviews.",
    features: ["360° captures", "Remote walkthroughs", "Visit archive"],
    imageSrc: "/marketing/services/virtual-tours.jpg",
    imageAlt: "BuildView project scans with a live Matterport virtual tour",
  },
  {
    id: "compare-tours",
    icon: GitCompareArrows,
    title: "Compare Progress",
    description:
      "Compare site visits side by side to see what changed between dates.",
    features: ["Date-to-date compare", "Change visibility", "Progress reviews"],
    imageSrc: "/marketing/services/compare-progress.jpg",
    imageAlt: "BuildView Compare Progress with side-by-side site visits",
  },
  {
    id: "reports",
    icon: FileText,
    title: "Progress Reports",
    description:
      "Consistent, executive-ready updates for developers, contractors, and clients.",
    features: ["Milestone summaries", "Downloadable history"],
    imageSrc: "/marketing/services/reports.jpg",
    imageAlt: "BuildView reports dashboard",
  },
  {
    id: "timeline",
    icon: Clock,
    title: "Construction Timeline",
    description:
      "Milestones, photos, and tours in one shared project history.",
    features: ["Milestone tracking", "Event history"],
    imageSrc: "/marketing/services/timeline.jpg",
    imageAlt: "BuildView construction timeline dashboard",
  },
  {
    id: "documents",
    icon: FolderOpen,
    title: "Document Management",
    description:
      "Drawings, BOQs, contracts, and approvals in one secure place.",
    features: ["Central repository", "Secure access"],
    imageSrc: "/marketing/services/documents.jpg",
    imageAlt: "BuildView documents dashboard",
  },
  {
    id: "issues",
    icon: AlertTriangle,
    title: "Issue Tracking",
    description:
      "Capture observations, assign owners, and track resolution to closure.",
    features: ["Photo evidence", "Priority workflows"],
    imageSrc: "/marketing/services/issues.jpg",
    imageAlt: "BuildView issues dashboard",
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Client Dashboard",
    description:
      "Role-based access to live project status, reports, and documents.",
    features: ["Role-based access", "Multi-project view"],
    imageSrc: "/marketing/services/dashboard.jpg",
    imageAlt: "BuildView client construction intelligence dashboard",
  },
];

const faqs = [
  {
    question: "How quickly can BuildView be deployed?",
    answer:
      "Most projects can be onboarded within a few days depending on project size and documentation requirements.",
  },
  {
    question: "Does BuildView support multiple projects?",
    answer:
      "Yes. Monitor multiple construction projects from one centralized dashboard.",
  },
  {
    question: "Can clients access the platform?",
    answer:
      "Yes. Role-based permissions ensure every stakeholder only sees the information relevant to them.",
  },
  {
    question: "Can we upload our own reports and drawings?",
    answer:
      "Absolutely. BuildView supports drawings, BOQs, contracts, reports, and other project documentation.",
  },
  {
    question: "Can BuildView fit into our existing construction reporting workflow?",
    answer:
      "BuildView provides a centralized workspace for project information, reports, drawings, visual records, and issue tracking. Our team can discuss how your existing workflow can be organized within the platform and confirm any specific integration requirements.",
  },
  {
    question: "How often do we need to capture our construction site?",
    answer:
      "Capture frequency can be planned according to your project milestones, reporting requirements, and monitoring needs. BuildView can help organize dated visual records so teams can review site conditions across different visits.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <ViewContentTracker contentName="services" contentCategory="product" />
      <PageHero
        eyebrow="Services"
        title="End-to-End Construction Monitoring Services"
        description="From virtual site capture to executive dashboards, BuildView provides everything required to monitor, document, and manage construction projects remotely."
      />

      <TrustBar />

      <Section>
        <SectionHeader
          eyebrow="Capabilities"
          title="Everything required for remote construction monitoring"
          description="Each service connects through one construction intelligence platform—so progress, documents, and decisions stay aligned."
        />
        <div className="mt-6 divide-y divide-slate-200/80 dark:divide-slate-800 lg:mt-10">
          {services.map((service, index) => (
            <ServiceSection
              key={service.id}
              {...service}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
      </Section>

      <Section variant="muted">
        <SectionHeader
          eyebrow="FAQ"
          title="Service questions"
          description="How BuildView supports construction monitoring rollouts."
        />
        <FaqSection items={faqs} />
      </Section>

      <PageCta
        title="Not sure which services you need?"
        description="Tell us about your project size, monitoring requirements, and reporting schedule."
        primaryLabel="Talk to our team"
        secondaryLabel="View projects"
        secondaryHref="/projects"
      />
    </>
  );
}
