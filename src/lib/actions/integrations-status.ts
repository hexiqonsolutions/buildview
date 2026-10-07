import "server-only";
import { isCalendlyEnabled, isGoogleAnalyticsEnabled } from "@/lib/integrations";
import { isContactEmailEnabled, isTransactionalEmailEnabled } from "@/lib/email/config";
import { hasStaffPermission } from "@/lib/auth/staff";

export type IntegrationsStatus = {
  calendly: boolean;
  googleAnalytics: boolean;
  contactEmail: boolean;
  notificationEmail: boolean;
  siteUrl: boolean;
  cronSecret: boolean;
};

const NONE_CONFIGURED: IntegrationsStatus = {
  calendly: false,
  googleAnalytics: false,
  contactEmail: false,
  notificationEmail: false,
  siteUrl: false,
  cronSecret: false,
};

export async function getIntegrationsStatus(): Promise<IntegrationsStatus> {
  if (!(await hasStaffPermission("read", "settings"))) return NONE_CONFIGURED;

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
