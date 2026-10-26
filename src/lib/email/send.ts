import "server-only";
import { emailConfig, isContactEmailEnabled } from "@/lib/email/config";
import { siteConfig } from "@/lib/site-config";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
  skipped?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Simple branded HTML for transactional notification emails. */
export function buildNotificationEmailHtml(params: {
  title: string;
  message: string;
  link?: string | null;
}): string {
  const absoluteLink = params.link
    ? params.link.startsWith("http")
      ? params.link
      : `${siteConfig.url}${params.link}`
    : null;

  const cta = absoluteLink
    ? `<p style="margin:24px 0 0">
        <a href="${escapeHtml(absoluteLink)}"
           style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">
          View in BuildView
        </a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;padding:28px 24px">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748B;font-weight:600">BuildView</p>
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0F172A">${escapeHtml(params.title)}</h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#334155;white-space:pre-wrap">${escapeHtml(params.message)}</p>
              ${cta}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendTransactionalEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  if (!isContactEmailEnabled()) {
    console.warn(
      "[sendTransactionalEmail] skipped — RESEND_API_KEY is not set. Configure it in Vercel env vars."
    );
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const valid = recipients.filter((email) => email?.includes("@"));
  if (valid.length === 0) {
    return { ok: false, skipped: true, error: "No valid recipients" };
  }

  const from = emailConfig.notificationFromEmail || emailConfig.contactFromEmail;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailConfig.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: valid,
        subject: params.subject,
        text: params.text,
        html: params.html,
        reply_to: params.replyTo,
      }),
    });

    const json = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      const error = json.message || `HTTP ${response.status}`;
      console.error("Transactional email error:", error);
      return { ok: false, error: String(error) };
    }

    return { ok: true, providerId: json.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transactional email failed";
    console.error("Transactional email failed:", error);
    return { ok: false, error: message };
  }
}
