import { CookieConsent } from "@/components/integrations/cookie-consent";
import { JsonLd } from "@/components/integrations/json-ld";

export default function SocialLandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-brand-primary text-white">
      <JsonLd />
      {children}
      <CookieConsent />
    </div>
  );
}
