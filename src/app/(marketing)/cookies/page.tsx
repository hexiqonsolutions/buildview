import { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import {
  LegalDocument,
  LegalFooterNote,
  LegalSection,
} from "@/components/marketing/legal-document";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description: "How BuildView uses cookies and similar technologies on our website.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalDocument title="Cookie Policy" lastUpdated="July 13, 2026">
      <LegalSection title="What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          us remember preferences, understand usage, and improve the BuildView experience.
        </p>
      </LegalSection>

      <LegalSection title="Cookies we use">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Essential cookies</strong> — Required for authentication, session management,
            security, and core portal functionality (including Supabase auth sessions).
          </li>
          <li>
            <strong>Preference cookies</strong> — Remember settings such as theme (light/dark mode)
            in the client and operations portals.
          </li>
          <li>
            <strong>Analytics cookies</strong> — Help us understand marketing site traffic and
            performance (e.g. Vercel Analytics, and Google Analytics when enabled and accepted).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Local storage">
        <p>
          BuildView may store non-cookie preferences in your browser&apos;s local storage — for
          example workspace selections in the operations portal and your cookie consent choice.
          These are not shared with third parties except as needed to operate integrated services
          you choose to use.
        </p>
      </LegalSection>

      <LegalSection title="Managing cookies">
        <p>
          You can control cookies through your browser settings. Disabling essential cookies may
          prevent you from signing in or using certain portal features. Our cookie consent banner
          lets you accept or decline analytics on the marketing site — Google Analytics loads only
          after you accept.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Embedded services such as Calendly scheduling may set their own cookies when you
          interact with them on our contact page. Please review their respective privacy policies.
        </p>
      </LegalSection>

      <LegalFooterNote />
    </LegalDocument>
  );
}
