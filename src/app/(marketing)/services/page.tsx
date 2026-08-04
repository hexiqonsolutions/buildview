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
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Construction Monitoring Services",
  description:
    "End-to-end construction monitoring services: Matterport virtual tours, compare progress, reports, timelines, document management, issue tracking, and client dashboards.",
  path: "/services",
});

const services = [
  {
    id: "virtual-tours",
    icon: Camera,
    title: "Matterport Virtual Tours",
    description:
      "Create immersive digital twins of construction sites for remote inspections, stakeholder reviews, and historical documentation.",
    features: [
      "Professional 360° site captures",
      "Remote walkthroughs for every stakeholder",
      "Historical digital twin archive",
      "Immersive project reviews",
    ],
  },
  {
    id: "compare-tours",
    icon: GitCompareArrows,
    title: "Compare Progress",
    description:
      "Compare different site visits to identify completed work, pending activities, and project changes.",
    features: [
      "Date-to-date site comparison",
      "Completed vs pending visibility",
      "Change detection across visits",
      "Investor-ready progress reviews",
    ],
  },
  {
    id: "reports",
    icon: FileText,
    title: "Progress Reports",
    description:
      "Generate professional reports for developers, contractors, consultants, and clients with consistent project updates.",
    features: [
      "Milestone and observation summaries",
      "Executive-ready documentation",
      "Consistent reporting cadence",
      "Downloadable project history",
    ],
  },
  {
    id: "timeline",
    icon: Clock,
    title: "Construction Timeline",
    description:
      "Monitor milestones, project events, and progress history with a visual timeline.",
    features: [
      "Interactive milestone tracking",
      "Photos, tours, and notes in sequence",
      "Clear project event history",
      "Shared progress context",
    ],
  },
  {
    id: "documents",
    icon: FolderOpen,
    title: "Document Management",
    description:
      "Store drawings, BOQs, contracts, RFIs, approvals, and technical documents in one secure repository.",
    features: [
      "Centralized document repository",
      "Drawings, BOQs, and contracts",
      "Secure stakeholder access",
      "Organized project folders",
    ],
  },
  {
    id: "issues",
    icon: AlertTriangle,
    title: "Issue Tracking",
    description:
      "Track observations, assign responsibilities, and monitor issue resolution from reporting to closure.",
    features: [
      "Capture and assign observations",
      "Priority and ownership workflows",
      "Photo-backed issue evidence",
      "Resolution to closure tracking",
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Client Dashboard",
    description:
      "Provide controlled access to live project information, reports, and documentation for every stakeholder.",
    features: [
      "Role-based portal access",
      "Live project visibility",
      "Reports and documentation hub",
      "Multi-project monitoring",
    ],
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
];

export default function ServicesPage() {
  return (
    <>
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
        <div className="space-y-8">
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
