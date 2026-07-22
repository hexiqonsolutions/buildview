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

  title: "Services",

  description:

    "BuildView construction monitoring services including Matterport virtual tours, progress reports, compare tours, document version control, and issue tracking.",

  path: "/services",

});



const services = [

  {

    id: "virtual-tours",

    icon: Camera,

    title: "Matterport Virtual Tours",

    description:

      "Professional 3D site captures using Matterport technology. Immersive, navigable walkthroughs let you inspect every detail of your construction project remotely — with dollhouse views, floor plans, and measurement tools.",

    features: [

      "Scheduled site captures",

      "Dollhouse & floor plan views",

      "Embedded portal viewer",

      "Building & floor scoping",

    ],

  },

  {

    id: "compare-tours",

    icon: GitCompareArrows,

    title: "Compare Tours",

    description:

      "Flagship side-by-side Matterport comparison across capture dates. Spot progress, regressions, and unresolved issues without returning to site — scoped by building and floor.",

    features: [

      "Date-to-date tour diff",

      "Issue overlay context",

      "Workspace-scoped captures",

      "Investor-ready walkthroughs",

    ],

  },

  {

    id: "reports",

    icon: FileText,

    title: "Progress Reports",

    description:

      "Comprehensive PDF reports documenting construction milestones, quality inspections, safety audits, and progress metrics — versioned, downloadable, and delivered on your schedule.",

    features: [

      "Progress & milestone reports",

      "Quality inspections",

      "Safety audit documentation",

      "Spatial report tagging",

    ],

  },

  {

    id: "timeline",

    icon: Clock,

    title: "Project Timeline",

    description:

      "A visual chronological record combining photos, virtual tour links, progress notes, and report references — giving every stakeholder a complete project history in one place.",

    features: [

      "Milestone tracking",

      "Photo documentation",

      "Tour integration",

      "Building & floor filters",

    ],

  },

  {

    id: "documents",

    icon: FolderOpen,

    title: "Document Management",

    description:

      "Secure, organized document storage for drawings, BOQs, contracts, approvals, and technical specifications — with version history, folder structure, and controlled client access.",

    features: [

      "Folder organization",

      "Version history & downloads",

      "Category filtering",

      "Admin-managed uploads",

    ],

  },

  {

    id: "issues",

    icon: AlertTriangle,

    title: "Issue Tracking",

    description:

      "Full issue management workflow with priority levels, assignments, photo documentation, due dates, and resolution tracking — visible to both field teams and clients.",

    features: [

      "Priority management",

      "Photo attachments",

      "Kanban workflow",

      "Spatial issue tagging",

    ],

  },

  {

    id: "dashboard",

    icon: LayoutDashboard,

    title: "Client Dashboard",

    description:

      "A premium enterprise portal providing real-time project visibility, activity summaries, and multi-project management — with role-based access for admins and clients.",

    features: [

      "Multi-project overview",

      "Global search (⌘K)",

      "Role-based access",

      "Invoice & notification hub",

    ],

  },

];



const faqs = [

  {

    question: "How often are Matterport captures scheduled?",

    answer:

      "Cadence depends on your plan and project phase — typically monthly during active construction, with bi-weekly options for fast-track builds.",

  },

  {

    question: "Can we upload our own documents and reports?",

    answer:

      "Yes. Your BuildView admin team manages uploads through the operations portal, including document replacements with full version history.",

  },

  {

    question: "Do clients see the same view as our internal team?",

    answer:

      "No — admin and client portals are intentionally separate. Clients get a clean, executive dashboard while your team uses the full operations control center.",

  },

  {

    question: "Is Compare Tours included in every plan?",

    answer:

      "Compare Tours is available on Portfolio and Enterprise plans where multiple captures exist per project workspace.",

  },

];



export default function ServicesPage() {

  return (

    <>

      <PageHero

        eyebrow="Services"

        title="End-to-end construction monitoring"

        description="From Matterport capture to client delivery — every service your project needs, unified in one platform."

      />



      <TrustBar />



      <Section>

        <SectionHeader

          eyebrow="Capabilities"

          title="Everything included in BuildView"

          description="Explore each module below. Every service connects through your secure client portal."

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

          description="How modules work together in a typical BuildView rollout."

        />

        <FaqSection items={faqs} />

      </Section>



      <PageCta

        title="Not sure which services you need?"

        description="Tell us about your project and we'll recommend the right monitoring package."

        primaryLabel="Talk to our team"

        secondaryLabel="View pricing"

        secondaryHref="/pricing"

      />

    </>

  );

}


