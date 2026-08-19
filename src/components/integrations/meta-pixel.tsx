"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  COOKIE_CONSENT_EVENT,
  hasAnalyticsConsent,
} from "@/lib/analytics/consent";
import { integrations, isMetaPixelEnabled } from "@/lib/integrations";

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    function sync() {
      setEnabled(isMetaPixelEnabled() && hasAnalyticsConsent());
    }

    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!enabled) {
    return null;
  }

  const pixelId = integrations.metaPixelId;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
