import { Metadata } from "next";
import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { BookDemoSection } from "@/components/marketing/book-demo-section";
import { ContactForm } from "@/components/marketing/contact-form";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Contact BuildView",
  description:
    "Talk about your construction project, request a live BuildView demo, or discuss monitoring requirements for residential, commercial, industrial, or infrastructure builds.",
  path: "/contact",
});

const contactMethods = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone.replace(/\D/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Office",
    value: siteConfig.contact.address,
  },
];

const reasons = [
  "Request a Live Demo",
  "Construction Monitoring Quote",
  "Enterprise Deployment",
  "Matterport Services",
  "Technical Support",
  "Partner With Us",
];

const faqs = [
  {
    question: "How quickly can BuildView be deployed?",
    answer:
      "Most projects can be onboarded within a few days depending on project size and documentation requirements.",
  },
  {
    question: "Does BuildView support multiple projects?",
    answer: "Yes. Monitor multiple construction projects from one centralized dashboard.",
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

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's Talk About Your Construction Project"
        description="Whether you're managing a residential tower, commercial complex, industrial facility, or infrastructure project, we'll help you build a monitoring solution that fits your workflow."
      />

      <TrustBar />

      <Section>
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white">
              Contact Information
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              We&apos;re here to answer questions about BuildView, schedule product demonstrations,
              or discuss construction monitoring requirements.
            </p>

            <ul className="mt-8 space-y-5">
              {contactMethods.map((method) => (
                <li key={method.label} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 ring-1 ring-brand-accent/20">
                    <method.icon className="h-5 w-5 text-brand-accent-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-primary dark:text-white">
                      {method.label}
                    </p>
                    {method.href ? (
                      <a
                        href={method.href}
                        className="mt-0.5 text-sm text-slate-600 transition-colors hover:text-brand-accent-dark dark:text-slate-400"
                      >
                        {method.value}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        {method.value}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 surface-card p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary dark:text-white">
                <Clock className="h-4 w-4 text-brand-accent" />
                Typical Response Time
              </div>
              <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between gap-4">
                  <dt>Demo Requests</dt>
                  <dd className="font-medium text-brand-primary dark:text-white">Within 24 Hours</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>General Queries</dt>
                  <dd className="font-medium text-brand-primary dark:text-white">
                    Within 1 Business Day
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary dark:text-white">
                <MessageSquare className="h-4 w-4 text-brand-accent" />
                Common Reasons Teams Contact Us
              </div>
              <ul className="mt-3 space-y-2">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="surface-card p-8 lg:p-10">
              <h2 className="font-display text-xl font-semibold text-brand-primary dark:text-white">
                Tell Us About Your Project
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Share your project type, monitoring needs, and preferred demo timing.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <BookDemoSection />

      <Section variant="muted">
        <SectionHeader
          eyebrow="FAQ"
          title="Before you reach out"
          description="Quick answers about deployment, access, and documentation."
        />
        <FaqSection items={faqs} />
      </Section>
    </>
  );
}
