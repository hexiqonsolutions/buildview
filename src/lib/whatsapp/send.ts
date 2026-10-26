import "server-only";
import { isWhatsAppEnabled, whatsappConfig } from "@/lib/whatsapp/config";
import type { NotificationRuleKey } from "@/lib/admin/platform-settings";

export const WHATSAPP_CRITICAL_RULES = [
  "onCriticalIssue",
  "onInvoiceSent",
  "onInvoicePaid",
  "onProjectRemoved",
] as const satisfies readonly NotificationRuleKey[];

export type WhatsAppCriticalRule = (typeof WHATSAPP_CRITICAL_RULES)[number];

export function isWhatsAppCriticalRule(
  rule: NotificationRuleKey | null | undefined
): rule is WhatsAppCriticalRule {
  return Boolean(rule && (WHATSAPP_CRITICAL_RULES as readonly string[]).includes(rule));
}

type SendWhatsAppParams = {
  toE164: string;
  body: string;
  rule?: WhatsAppCriticalRule;
  /** Content template variables: title, message, link */
  variables?: { title?: string; message?: string; link?: string };
};

export type SendWhatsAppResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
  skipped?: boolean;
};

function templateSidForRule(rule?: WhatsAppCriticalRule): string {
  if (!rule) return "";
  return whatsappConfig.templates[rule] ?? "";
}

/**
 * Send a WhatsApp message via Twilio.
 * Prefer approved Content Templates when SIDs are configured; otherwise plain body
 * (works in the 24h session window / sandbox).
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled()) {
    return { ok: false, skipped: true, error: "WhatsApp not configured" };
  }

  const to = params.toE164.startsWith("whatsapp:")
    ? params.toE164
    : `whatsapp:${params.toE164}`;
  const from = whatsappConfig.from.startsWith("whatsapp:")
    ? whatsappConfig.from
    : `whatsapp:${whatsappConfig.from}`;

  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", from);

  const contentSid = templateSidForRule(params.rule);
  if (contentSid) {
    form.set("ContentSid", contentSid);
    const vars: Record<string, string> = {};
    if (params.variables?.title) vars["1"] = params.variables.title;
    if (params.variables?.message) vars["2"] = params.variables.message;
    if (params.variables?.link) vars["3"] = params.variables.link;
    if (Object.keys(vars).length > 0) {
      form.set("ContentVariables", JSON.stringify(vars));
    }
  } else {
    form.set("Body", params.body);
  }

  const auth = Buffer.from(
    `${whatsappConfig.accountSid}:${whatsappConfig.authToken}`
  ).toString("base64");

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );

    const json = (await response.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };

    if (!response.ok) {
      const error =
        json.message || json.error_message || `Twilio HTTP ${response.status}`;
      console.error("[sendWhatsAppMessage]", error);
      return { ok: false, error };
    }

    return { ok: true, providerId: json.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp send failed";
    console.error("[sendWhatsAppMessage]", message);
    return { ok: false, error: message };
  }
}
