import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  LegalDocument,
  LegalFooterNote,
  LegalSection,
} from "@/components/marketing/legal-document";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: "Terms and conditions for using the BuildView website and platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated="July 13, 2026">
      <LegalSection title="Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to BuildView&apos;s website,
          client portal, and related services (collectively, the &quot;Service&quot;). By accessing
          or using the Service, you agree to these Terms. If you use BuildView on behalf of an
          organization, you represent that you have authority to bind that organization.
        </p>
      </LegalSection>

      <LegalSection title="Service description">
        <p>
          BuildView provides construction operations and project monitoring software, including
          Matterport virtual tour delivery, progress reports, document management, issue tracking,
          timelines, invoicing visibility, and related collaboration features. Specific features may
          vary by subscription plan or statement of work.
        </p>
      </LegalSection>

      <LegalSection title="Operations model">
        <p>
          BuildView is operated as a managed service: the BuildView team captures site data and
          uploads project information. Client portal users are granted view access to content for
          projects assigned to them. Unless expressly agreed in writing, clients do not upload
          content directly through the portal.
        </p>
      </LegalSection>

      <LegalSection title="Accounts & access">
        <p>
          You are responsible for safeguarding login credentials and for activity under your
          account. Access is limited by role and project assignment. You must notify BuildView
          promptly of any unauthorized access or security concern.
        </p>
      </LegalSection>

      <LegalSection title="Subscription & fees">
        <p>
          Paid plans, capture schedules, and professional services are governed by your order form,
          proposal, or master services agreement. Fees, billing cycles, and renewal terms are as
          stated in those documents. Free trials or pilot access may be modified or discontinued at
          our discretion.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for unlawful, harmful, or fraudulent purposes</li>
          <li>Attempt to bypass authentication, access controls, or rate limits</li>
          <li>Reverse engineer, scrape, or overload the Service except as permitted by law</li>
          <li>Upload or distribute malware, infringing content, or confidential data without rights</li>
          <li>Interfere with other users or the integrity of the platform</li>
        </ul>
      </LegalSection>

      <LegalSection title="Client content & license">
        <p>
          Your organization retains ownership of project data, documents, imagery, and other
          content provided to BuildView or captured on your behalf. You grant BuildView a limited,
          non-exclusive license to host, process, transmit, and display that content solely to
          operate the Service for authorized users.
        </p>
        <p>
          You represent that you have the rights and permissions needed for BuildView to process
          client content, including imagery of job sites and third-party personnel where applicable.
        </p>
      </LegalSection>

      <LegalSection title="Confidentiality">
        <p>
          Each party may receive confidential information from the other. Except as needed to
          provide the Service or as required by law, the receiving party will protect confidential
          information using reasonable care and will not disclose it to unauthorized third parties.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          The Service may integrate with or link to third-party services (for example Matterport,
          Calendly, or email providers). Those services are subject to their own terms and privacy
          policies. BuildView is not responsible for third-party services outside our reasonable
          control.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis to the
          maximum extent permitted by law. BuildView does not warrant uninterrupted or error-free
          operation. Construction monitoring outputs are informational and do not replace
          professional engineering, safety, or legal advice on site.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, BuildView and its affiliates will not be liable
          for indirect, incidental, special, consequential, or punitive damages, or for loss of
          profits, data, or goodwill. Our aggregate liability arising from the Service will not
          exceed the fees paid by you to BuildView for the Service in the twelve (12) months
          preceding the claim, except where liability cannot be limited by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          We may suspend or terminate access for violation of these Terms, non-payment, or security
          risk. Upon termination, your right to use the Service ends. Provisions that by nature
          should survive (including confidentiality, disclaimers, and limitations of liability) will
          survive termination.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these Terms from time to time. Material changes will be posted on this page
          with an updated effective date. Continued use after changes constitutes acceptance where
          permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These Terms are governed by the laws of the State of California, United States, without
          regard to conflict-of-law principles, except where mandatory local law applies. Disputes
          will be resolved in the courts located in San Francisco County, California, unless
          otherwise agreed in a signed enterprise agreement.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms? Contact us through our{" "}
          <Link href="/contact" className="font-medium text-brand-accent-dark hover:underline">
            contact page
          </Link>{" "}
          or review our{" "}
          <Link href="/privacy" className="font-medium text-brand-accent-dark hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalFooterNote />
    </LegalDocument>
  );
}
