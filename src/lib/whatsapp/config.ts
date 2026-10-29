import "server-only";

/** Twilio WhatsApp — critical-alert channel only. */
export const whatsappConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  /** e.g. whatsapp:+14155238886 or your approved sender */
  from: process.env.TWILIO_WHATSAPP_FROM ?? "",
  /**
   * Optional Content Template SIDs (Twilio Content API).
   * When unset, send.ts uses the shared sandbox Appointment Reminder ContentSid,
   * then freeform Body (24h session only). Trial accounts require ContentSid.
   */
  templates: {
    onCriticalIssue: process.env.TWILIO_WA_TEMPLATE_CRITICAL_ISSUE ?? "",
    onInvoiceSent: process.env.TWILIO_WA_TEMPLATE_INVOICE_SENT ?? "",
    onInvoicePaid: process.env.TWILIO_WA_TEMPLATE_INVOICE_PAID ?? "",
    onProjectRemoved: process.env.TWILIO_WA_TEMPLATE_PROJECT_REMOVED ?? "",
  },
} as const;

export function isWhatsAppEnabled(): boolean {
  return Boolean(
    whatsappConfig.accountSid &&
      whatsappConfig.authToken &&
      whatsappConfig.from
  );
}
