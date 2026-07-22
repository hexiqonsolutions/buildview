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
  title: "Contact",
  description:
    "Book a BuildView demo, request a quote, or get in touch with our construction monitoring team.",
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
  "Book a live platform demo",
  "Get a custom pricing quote",
  "Discuss enterprise rollout",
  "Technical or support inquiry",
];

const faqs = [
  {
    question: "How quickly can we get started?",
    answer:
      "Most projects go live within 1–2 weeks: baseline capture, portal setup, and client invites. Enterprise rollouts include a dedicated onboarding workshop.",
  },
  {
    question: "Do you work outside the United States?",
    answer:
      "Yes. BuildView supports projects globally where Matterport capture partners are available. Contact us with your site location for scheduling.",
  },
  {
    question: "Can we integrate with our existing PM tools?",
    answer:
      "Enterprise plans support custom integrations and API access. We commonly work alongside Procore, Autodesk, and internal reporting workflows.",
  },
  {
    question: "What support do existing clients receive?",
    answer:
      "Active clients can sign in to the portal for support requests. Priority response times are included on Portfolio and Enterprise plans.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your project"
        description="Book a demo, request a quote, or ask us anything about remote construction monitoring."
      />

      <TrustBar />

      <Section>
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-brand-primary dark:text-white">
              Get in touch
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Our team typically responds within one business day. For urgent support,
              existing clients can sign in to the portal.
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
                Response time
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Demo requests: within 24 hours · Sales inquiries: 1–2 business days
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary dark:text-white">
                <MessageSquare className="h-4 w-4 text-brand-accent" />
                Common reasons to reach out
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
                Send us a message
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Fill out the form and we&apos;ll be in touch shortly.
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
          description="Quick answers to common sales and onboarding questions."
        />
        <FaqSection items={faqs} />
      </Section>
    </>
  );
}
