import { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  LegalDocument,
  LegalFooterNote,
  LegalSection,
} from "@/components/marketing/legal-document";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How BuildView collects, uses, and protects your personal information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="July 13, 2026">
      <LegalSection title="Overview">
        <p>
          BuildView (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a construction
          operations and project monitoring platform. We capture site progress using Matterport
          virtual tours, reports, documents, timelines, and issue tracking — and make that
          information available to authorized project stakeholders through a secure client portal.
        </p>
        <p>
          This Privacy Policy describes how we collect, use, and protect personal information when
          you visit our marketing website, request a demo, or use the BuildView client or
          operations portal.
        </p>
      </LegalSection>

      <LegalSection title="Who this policy applies to">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Website visitors</strong> — people browsing buildview.io, submitting contact
            forms, or scheduling demos.
          </li>
          <li>
            <strong>Client portal users</strong> — developers, owners, architects, contractors, and
            consultants invited to view project information for their organization.
          </li>
          <li>
            <strong>BuildView operations users</strong> — BuildView employees and contractors who
            manage projects, uploads, and client access through the internal operations portal.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Information we collect">
        <p>Depending on how you interact with BuildView, we may process:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Contact details</strong> — name, email, company, phone, and messages from demo
            or sales inquiries.
          </li>
          <li>
            <strong>Account data</strong> — login credentials, role assignments, client and project
            associations, and activity logs needed for security and audit.
          </li>
          <li>
            <strong>Project content</strong> — documents, reports, photos, Matterport tour links,
            timeline entries, issues, invoices, and related metadata uploaded or managed by the
            BuildView team on behalf of clients.
          </li>
          <li>
            <strong>Usage and technical data</strong> — IP address, browser type, device
            information, pages viewed, and performance metrics on our marketing site and portals.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, operate, and improve the BuildView platform</li>
          <li>Authenticate users and enforce role-based access controls</li>
          <li>Respond to demo requests, support inquiries, and account administration</li>
          <li>Send service-related notifications where configured</li>
          <li>Monitor security, prevent abuse, and maintain audit trails</li>
          <li>Analyze marketing site usage when you have consented to analytics cookies</li>
          <li>Comply with legal obligations and enforce our terms</li>
        </ul>
      </LegalSection>

      <LegalSection title="How project data is handled">
        <p>
          BuildView&apos;s operations model is that the BuildView team captures and uploads project
          information. Client portal users receive read-oriented access to content assigned to their
          projects. We process project data solely to deliver the service to your organization and
          authorized users — not for unrelated advertising purposes.
        </p>
      </LegalSection>

      <LegalSection title="Analytics & cookies">
        <p>
          Our marketing website may use analytics tools such as Vercel Analytics and, when
          configured, Google Analytics. Google Analytics loads only if you accept analytics cookies
          through our consent banner. Essential cookies are required for authentication and core
          portal functionality. For details, see our{" "}
          <Link href="/cookies" className="font-medium text-brand-accent-dark hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Service providers">
        <p>
          We use trusted infrastructure and service providers to operate BuildView. These may
          process data on our behalf under contractual safeguards, including providers for:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Cloud hosting and deployment (e.g. Vercel)</li>
          <li>Database, authentication, and file storage (e.g. Supabase)</li>
          <li>Transactional email delivery (e.g. Resend)</li>
          <li>Demo scheduling embeds (e.g. Calendly, when enabled)</li>
          <li>Website analytics (e.g. Google Analytics, when enabled and consented)</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="Data retention & security">
        <p>
          We retain information for as long as needed to provide services, meet contractual
          obligations, and satisfy legal requirements. Project content is retained according to
          your agreement with BuildView and applicable law.
        </p>
        <p>
          We apply technical and organizational measures including encrypted transport (HTTPS),
          access controls, row-level security policies, private storage buckets for sensitive
          media, and audit logging for administrative actions.
        </p>
      </LegalSection>

      <LegalSection title="International transfers">
        <p>
          BuildView may process data in the United States and other countries where our service
          providers operate. Where required, we rely on appropriate safeguards for cross-border
          transfers.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict, or
          export personal data, and to object to certain processing. To exercise these rights,
          contact us using the details below. We will respond within a reasonable timeframe and as
          required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          BuildView is a business-to-business platform and is not directed at children under 16.
          We do not knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be posted on
          this page with an updated &quot;Last updated&quot; date. Continued use after changes
          constitutes acknowledgment of the revised policy where permitted by law.
        </p>
      </LegalSection>

      <LegalFooterNote />
    </LegalDocument>
  );
}
