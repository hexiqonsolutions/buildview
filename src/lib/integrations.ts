import { siteConfig } from "@/lib/site-config";

export const marketingRoutes = [
  "",
  "/about",
  "/services",
  "/projects",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

export const integrations = {
  calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL ?? "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  contactToEmail: process.env.CONTACT_TO_EMAIL ?? siteConfig.contact.email,
  contactFromEmail:
    process.env.CONTACT_FROM_EMAIL ?? `BuildView <onboarding@resend.dev>`,
} as const;

export function isCalendlyEnabled(): boolean {
  return Boolean(integrations.calendlyUrl);
}

export function isGoogleAnalyticsEnabled(): boolean {
  return Boolean(integrations.gaMeasurementId);
}

export function isContactEmailEnabled(): boolean {
  return Boolean(integrations.resendApiKey);
}

export function isTransactionalEmailEnabled(): boolean {
  return isContactEmailEnabled();
}
