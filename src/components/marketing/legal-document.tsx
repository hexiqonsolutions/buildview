import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Section } from "@/components/marketing/section";

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  return (
    <>
      <section className="border-b border-slate-200/80 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="site-container max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent-dark">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold text-brand-primary dark:text-white">
            {title}
          </h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </div>
      </section>
      <Section className="!pt-12">
        <div className="prose-legal mx-auto max-w-3xl">{children}</div>
      </Section>
    </>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-semibold text-brand-primary dark:text-white">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {children}
      </div>
    </section>
  );
}

export function LegalFooterNote() {
  return (
    <p className="mt-12 border-t border-slate-200/80 pt-8 text-sm text-slate-500 dark:border-slate-800">
      Questions? Contact us at{" "}
      <a
        href={`mailto:${siteConfig.contact.email}`}
        className="font-medium text-brand-accent-dark hover:underline"
      >
        {siteConfig.contact.email}
      </a>
      . See also our{" "}
      <Link href="/privacy" className="font-medium text-brand-accent-dark hover:underline">
        Privacy Policy
      </Link>
      ,{" "}
      <Link href="/terms" className="font-medium text-brand-accent-dark hover:underline">
        Terms of Service
      </Link>
      , and{" "}
      <Link href="/cookies" className="font-medium text-brand-accent-dark hover:underline">
        Cookie Policy
      </Link>
      .
    </p>
  );
}
