import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { CookieConsent } from "@/components/integrations/cookie-consent";
import { MarketingTheme } from "@/components/integrations/marketing-theme";
import { OrganizationJsonLd } from "@/components/integrations/organization-json-ld";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-background">
      <MarketingTheme />
      <OrganizationJsonLd />
      <MarketingHeader />
      <main className="flex-1 pt-[4.5rem] lg:pt-20">{children}</main>
      <MarketingFooter />
      <CookieConsent />
    </div>
  );
}
