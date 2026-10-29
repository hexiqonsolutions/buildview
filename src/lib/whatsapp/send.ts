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

/**
 * Twilio Sandbox / trial shared "Appointment Reminders" Content Template:
 * "Your appointment is coming up on {{1}} at {{2}}"
 * Business-initiated WhatsApp on trial/sandbox requires ContentSid (error 21654).
 */
export const TWILIO_SANDBOX_APPOINTMENT_CONTENT_SID =
  "HXb5b62575e6e4ff6129ad7c8efe1f983e";

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

function truncateVar(value: string, max = 200): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function requiresContentSid(error?: string, code?: number): boolean {
  if (code === 21654) return true;
  return Boolean(error && /contentsid required/i.test(error));
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

async function sendWithContentSid(params: {
  to: string;
  from: string;
  contentSid: string;
  variables: Record<string, string>;
}): Promise<{ ok: boolean; sid?: string; error?: string; code?: number }> {
  const form = new URLSearchParams();
  form.set("To", params.to);
  form.set("From", params.from);
  form.set("ContentSid", params.contentSid);
  if (Object.keys(params.variables).length > 0) {
    form.set("ContentVariables", JSON.stringify(params.variables));
  }
  return twilioCreateMessage(form);
}

/**
 * Map BuildView alert fields onto common Twilio sandbox templates.
 * Custom approved templates with {{1}}/{{2}}/{{3}} still get title/message/link.
 */
function contentVariablesForSid(
  contentSid: string,
  variables?: SendWhatsAppParams["variables"]
): Record<string, string> {
  const title = truncateVar(variables?.title || "BuildView alert");
  const message = truncateVar(variables?.message || "Open BuildView");
  const link = truncateVar(variables?.link || "Open BuildView");

  // Sandbox appointment reminder: {{1}} date-like, {{2}} time-like
  if (contentSid === TWILIO_SANDBOX_APPOINTMENT_CONTENT_SID) {
    return { "1": title, "2": message };
  }

  const vars: Record<string, string> = { "1": title, "2": message };
  if (variables?.link) vars["3"] = link;
  return vars;
}

/**
 * Send a WhatsApp message via Twilio.
 *
 * Trial / Sandbox business-initiated sends require an approved ContentSid
 * (Twilio 21654 "ContentSid Required"). Freeform Body only works inside the
 * 24h customer-care window after the user messages the sandbox.
 *
 * Order: configured template → sandbox appointment template → freeform Body.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled()) {
    return { ok: false, skipped: true, error: "WhatsApp not configured" };
  }

  const to = toWhatsAppAddress(params.toE164);
  const from = toWhatsAppAddress(whatsappConfig.from);
  const configuredSid = templateSidForRule(params.rule);

  const contentAttempts = [
    configuredSid,
    // Always have a sandbox-safe fallback so trial accounts can deliver.
    TWILIO_SANDBOX_APPOINTMENT_CONTENT_SID,
  ].filter((sid, index, all) => Boolean(sid) && all.indexOf(sid) === index);

  try {
    let lastContentError: string | undefined;

    for (const contentSid of contentAttempts) {
      const result = await sendWithContentSid({
        to,
        from,
        contentSid,
        variables: contentVariablesForSid(contentSid, params.variables),
      });
      if (result.ok) {
        return { ok: true, providerId: result.sid };
      }
      lastContentError = result.error;
      console.warn("[sendWhatsAppMessage] ContentSid failed", {
        contentSid,
        error: result.error,
        code: result.code,
      });
    }

    // In-session freeform (only works after the user recently messaged the From number).
    const plain = new URLSearchParams();
    plain.set("To", to);
    plain.set("From", from);
    plain.set("Body", params.body);

    const bodyResult = await twilioCreateMessage(plain);
    if (bodyResult.ok) {
      return { ok: true, providerId: bodyResult.sid };
    }

    const error = requiresContentSid(bodyResult.error, bodyResult.code)
      ? `${bodyResult.error} — set TWILIO_WA_TEMPLATE_* to an approved ContentSid, or keep From as sandbox whatsapp:+14155238886 and ensure the recipient joined.`
      : bodyResult.error || lastContentError || "WhatsApp send failed";

    console.error("[sendWhatsAppMessage]", error, { to, from });
    return { ok: false, error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp send failed";
    console.error("[sendWhatsAppMessage]", message);
    return { ok: false, error: message };
  }
}
