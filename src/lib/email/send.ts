import "server-only";
import { emailConfig, isContactEmailEnabled } from "@/lib/email/config";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendTransactionalEmail(params: SendEmailParams): Promise<boolean> {
  if (!isContactEmailEnabled()) return false;

  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const valid = recipients.filter((email) => email?.includes("@"));
  if (valid.length === 0) return false;

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

    if (!response.ok) {
      console.error("Transactional email error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Transactional email failed:", error);
    return false;
  }
}
