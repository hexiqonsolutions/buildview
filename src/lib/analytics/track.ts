"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import { isGoogleAnalyticsEnabled, integrations } from "@/lib/integrations";

type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: TrackParams
): void {
  if (!isGoogleAnalyticsEnabled() || !hasAnalyticsConsent()) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", eventName, params, integrations.gaMeasurementId);
  }
}
