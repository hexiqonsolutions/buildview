import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { CookieConsent } from "@/components/integrations/cookie-consent";
import { MarketingTheme } from "@/components/integrations/marketing-theme";
import { JsonLd } from "@/components/integrations/json-ld";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-background">
      <MarketingTheme />
      <JsonLd />
      <MarketingHeader />
      <main className="flex-1 pt-18 lg:pt-20">{children}</main>
      <MarketingFooter />
      <CookieConsent />
    </div>
  );
}
