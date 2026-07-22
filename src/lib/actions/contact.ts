"use server";

import { integrations, isContactEmailEnabled } from "@/lib/integrations";
import { sendTransactionalEmail } from "@/lib/email/send";
import { siteConfig } from "@/lib/site-config";
import {
  contactFormSchema,
  formatContactEmailBody,
} from "@/lib/validations/contact";

export type ContactActionState = {
  error?: string;
  success?: string;
};

export async function submitContact(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  if (formData.get("_gotcha")) {
    return {
      success:
        "Thank you for reaching out. Our team will respond within one business day.",
    };
  }

  const parsed = contactFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    interest: formData.get("interest"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid form data" };
  }

  const data = parsed.data;

  if (isContactEmailEnabled()) {
    const sent = await sendTransactionalEmail({
      to: integrations.contactToEmail,
      replyTo: data.email,
      subject: `[BuildView] ${data.interest === "demo" ? "Demo request" : "Contact"} from ${data.name}`,
      text: formatContactEmailBody(data),
    });

    if (!sent) {
      return {
        error: "Unable to send your message right now. Please email us directly.",
      };
    }
  } else if (process.env.NODE_ENV === "development") {
    console.info("[BuildView contact]", formatContactEmailBody(data));
  } else {
    return {
      error: `Email delivery is not configured. Please contact us at ${siteConfig.contact.email}.`,
    };
  }

  return {
    success:
      "Thank you for reaching out. Our team will respond within one business day.",
  };
}
