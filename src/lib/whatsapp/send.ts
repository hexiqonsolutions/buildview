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
  return (whatsappConfig.templates[rule] ?? "").trim();
}

/** Normalize to `whatsapp:+E164` (no spaces). */
function toWhatsAppAddress(input: string): string {
  const raw = input.trim();
  const withoutPrefix = raw.replace(/^whatsapp:/i, "").trim();
  const digits = withoutPrefix.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+${digits.replace(/\D/g, "")}`;
  return `whatsapp:${e164}`;
}

async function twilioCreateMessage(
  form: URLSearchParams
): Promise<{ ok: boolean; sid?: string; error?: string; code?: number }> {
  const auth = Buffer.from(
    `${whatsappConfig.accountSid}:${whatsappConfig.authToken}`
  ).toString("base64");

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
    code?: number;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: json.message || json.error_message || `Twilio HTTP ${response.status}`,
      code: json.code,
    };
  }

  return { ok: true, sid: json.sid };
}

/**
 * Send a WhatsApp message via Twilio.
 * Prefer approved Content Templates when SIDs are configured; otherwise plain body
 * (works in the 24h session window / sandbox). If a ContentSid is rejected, retry
 * with a plain body so sandbox testing still works.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled()) {
    return { ok: false, skipped: true, error: "WhatsApp not configured" };
  }

  const to = toWhatsAppAddress(params.toE164);
  const from = toWhatsAppAddress(whatsappConfig.from);

  const contentSid = templateSidForRule(params.rule);

  try {
    if (contentSid) {
      const templated = new URLSearchParams();
      templated.set("To", to);
      templated.set("From", from);
      templated.set("ContentSid", contentSid);
      const vars: Record<string, string> = {};
      if (params.variables?.title) vars["1"] = params.variables.title;
      if (params.variables?.message) vars["2"] = params.variables.message;
      if (params.variables?.link) vars["3"] = params.variables.link;
      if (Object.keys(vars).length > 0) {
        templated.set("ContentVariables", JSON.stringify(vars));
      }

      const first = await twilioCreateMessage(templated);
      if (first.ok) {
        return { ok: true, providerId: first.sid };
      }

      // Invalid / missing templates (e.g. 21655) — fall back to freeform body.
      console.warn(
        "[sendWhatsAppMessage] ContentSid failed; retrying with Body",
        first.error,
        first.code
      );
    }

    const plain = new URLSearchParams();
    plain.set("To", to);
    plain.set("From", from);
    plain.set("Body", params.body);

    const second = await twilioCreateMessage(plain);
    if (!second.ok) {
      console.error("[sendWhatsAppMessage]", second.error, { to, from });
      return { ok: false, error: second.error };
    }

    return { ok: true, providerId: second.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp send failed";
    console.error("[sendWhatsAppMessage]", message);
    return { ok: false, error: message };
  }
}
