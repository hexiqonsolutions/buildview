import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@/components/integrations/google-analytics";
import { MetaPixel } from "@/components/integrations/meta-pixel";

export function SiteAnalytics() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <GoogleAnalytics />
      <MetaPixel />
    </>
  );
}
