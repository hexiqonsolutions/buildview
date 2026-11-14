import { Suspense } from "react";
import { Metadata } from "next";
import { Clock, Instagram, Mail, MapPin, MessageCircle, MessageSquare, Phone } from "lucide-react";
import { BookDemoSection } from "@/components/marketing/book-demo-section";
import { ContactForm } from "@/components/marketing/contact-form";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { TrustBar } from "@/components/marketing/trust-bar";
import { ViewContentTracker } from "@/components/analytics/view-content-tracker";
import { pageMetadata } from "@/lib/seo";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Book a Demo | Contact BuildView",
  description:
    "Request a BuildView demo for construction intelligence, real estate virtual tours, or interior showcase. Talk to our team about your project.",
  path: "/contact",
});

type ContactMethod = {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
};

const contactMethods: ContactMethod[] = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    icon: Phone,
    label: "Phone (Sales)",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone.replace(/\D/g, "")}`,
  },
  {
    icon: Phone,
    label: "Phone (Support)",
    value: siteConfig.contact.phoneAlt,
    href: `tel:${siteConfig.contact.phoneAlt.replace(/\D/g, "")}`,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: siteConfig.contact.phone,
    href: getWhatsAppUrl("Hi BuildView, I'd like to book a demo."),
  },
  {
    icon: MapPin,
    label: "Office",
    value: siteConfig.contact.address,
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: siteConfig.instagram.handle,
    href: siteConfig.instagram.url,
  },
];

const reasons = [
  "Request a Live Demo",
  "Construction Intelligence",
  "Real Estate Property Tours",
  "Interior Showcase Portfolio",
  "Enterprise Deployment",
  "Partner With Us",
];

const faqs = [
  {
    question: "Which industries does BuildView serve?",
    answer:
      "BuildView supports construction intelligence, real estate virtual property tours, and interior design showcases—all powered by immersive 360° technology.",
  },
  {
    question: "How quickly can a project be onboarded?",
    answer:
      "Most projects can be onboarded within a few days depending on project size and capture requirements.",
  },
  {
    question: "Can clients access the platform?",
    answer:
      "Yes. Role-based permissions ensure every stakeholder only sees the information relevant to them.",
  },
  {
    question: "Can we embed tours on websites?",
    answer:
      "Virtual experiences can be shared via secure links and, where compatible, embedded into project websites and landing pages.",
  },
];

export default function ContactPage() {
  return (
    <>
      <ViewContentTracker contentName="contact" contentCategory="conversion" />
      <PageHero
        eyebrow="Contact"
        title="Let's Build Your Digital Experience"
        description="Whether you monitor construction, showcase interiors, or market properties, we'll help you create the right immersive experience for your team and clients."
      />

      <TrustBar />

      <Section>
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white">
              Contact Information
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Ask about BuildView solutions, schedule a product demonstration, or discuss capture
              and presentation requirements.
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
                        {...(method.href.startsWith("http")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
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
                Share your service interest, project type, location, and preferred demo timing.
              </p>
              <div className="mt-8">
                <Suspense
                  fallback={
                    <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  }
                >
                  <ContactForm />
                </Suspense>
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
          description="Quick answers about solutions, access, and deployment."
        />
        <FaqSection items={faqs} />
      </Section>
    </>
  );
}
