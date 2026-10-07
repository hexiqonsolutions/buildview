import "server-only";
import { siteConfig } from "@/lib/site-config";

/** Server-only email settings; kept out of lib/integrations, which client components import. */
export const emailConfig = {
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  contactToEmail: process.env.CONTACT_TO_EMAIL ?? siteConfig.contact.email,
  contactFromEmail: process.env.CONTACT_FROM_EMAIL ?? `BuildView <onboarding@resend.dev>`,
  notificationFromEmail: process.env.NOTIFICATION_FROM_EMAIL ?? "",
} as const;

export function isContactEmailEnabled(): boolean {
  return Boolean(emailConfig.resendApiKey);
}

export function isTransactionalEmailEnabled(): boolean {
  return isContactEmailEnabled();
}
