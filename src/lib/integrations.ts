export const marketingRoutes = [
  "",
  "/about",
  "/services",
  "/projects",
  "/contact",
  "/links",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

/**
 * Public (browser-safe) integration settings only. Client components import this
 * module, so never add non-NEXT_PUBLIC_ values here — see lib/email/config.ts.
 */
export const integrations = {
  calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL ?? "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
} as const;

export function isCalendlyEnabled(): boolean {
  return Boolean(integrations.calendlyUrl);
}

export function isGoogleAnalyticsEnabled(): boolean {
  return Boolean(integrations.gaMeasurementId);
}

export function isMetaPixelEnabled(): boolean {
  return Boolean(integrations.metaPixelId);
}

export function isAnalyticsConfigured(): boolean {
  return isGoogleAnalyticsEnabled() || isMetaPixelEnabled();
}
