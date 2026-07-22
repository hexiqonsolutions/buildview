"use server";

import {
  isCalendlyEnabled,
  isContactEmailEnabled,
  isGoogleAnalyticsEnabled,
  isTransactionalEmailEnabled,
} from "@/lib/integrations";

export type IntegrationsStatus = {
  calendly: boolean;
  googleAnalytics: boolean;
  contactEmail: boolean;
  notificationEmail: boolean;
  siteUrl: boolean;
  cronSecret: boolean;
};

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  return {
    calendly: isCalendlyEnabled(),
    googleAnalytics: isGoogleAnalyticsEnabled(),
    contactEmail: isContactEmailEnabled(),
    notificationEmail: isTransactionalEmailEnabled(),
    siteUrl: Boolean(
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL
    ),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };
}
