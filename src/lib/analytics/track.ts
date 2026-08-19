"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";
import {
  analyticsEvents,
  gaEventNames,
  metaStandardEvents,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import {
  integrations,
  isGoogleAnalyticsEnabled,
  isMetaPixelEnabled,
} from "@/lib/integrations";

type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
  }
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toGaParams(params?: TrackParams): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) mapped[key] = value;
  }
  return mapped;
}

export function trackEvent(
  eventName: AnalyticsEventName | string,
  params?: TrackParams
): void {
  if (!hasAnalyticsConsent()) return;

  const known = Object.values(analyticsEvents).includes(
    eventName as AnalyticsEventName
  );
  const eventId = createEventId();
  const payload = { ...params, event_id: eventId };

  if (isGoogleAnalyticsEnabled() && typeof window.gtag === "function") {
    const gaName = known
      ? gaEventNames[eventName as AnalyticsEventName]
      : eventName;
    window.gtag("event", gaName, toGaParams(payload));
  }

  if (isMetaPixelEnabled() && typeof window.fbq === "function") {
    if (known) {
      const meta = metaStandardEvents[eventName as AnalyticsEventName];
      if (meta.type === "track") {
        window.fbq("track", meta.name, payload, { eventID: eventId });
      } else {
        window.fbq("trackCustom", meta.name, payload, { eventID: eventId });
      }
    } else {
      window.fbq("trackCustom", eventName, payload, { eventID: eventId });
    }
  }

  if (isMetaPixelEnabled()) {
    void fetch("/api/analytics/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: known ? eventName : "CtaClick",
        eventId,
        params,
        eventSourceUrl: window.location.href,
      }),
    }).catch(() => {
      /* CAPI is best-effort and must never break the UI */
    });
  }

  if (
    process.env.NODE_ENV === "development" &&
    !isGoogleAnalyticsEnabled() &&
    !isMetaPixelEnabled()
  ) {
    console.info("[analytics]", eventName, payload, integrations.gaMeasurementId);
  }
}

export function trackCtaClick(cta: string, href: string): void {
  trackEvent(analyticsEvents.ctaClick, { cta, href });
  if (cta.toLowerCase().includes("demo")) {
    trackEvent(analyticsEvents.bookDemo, { cta, href });
  }
}
