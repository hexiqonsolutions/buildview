import { z } from "zod";
import { email, optionalText, personName, text } from "@/lib/validations/primitives";

export const contactFormSchema = z
  .object({
    name: personName("Full name"),
    email: email(),
    company: optionalText("Company", { max: 120 }),
    interest: z.enum(["demo", "quote", "enterprise", "matterport", "partnership", "support", "other"], {
      errorMap: () => ({ message: "Please select what you're interested in" }),
    }),
    message: text("Message", { min: 10, max: 5000, multiline: true }),
    /** Honeypot — must be empty (filled-in submissions are dropped before validation). */
    _gotcha: z.literal("").optional(),
  })
  .strict();

export type ContactFormInput = z.infer<typeof contactFormSchema>;

const interestLabels: Record<ContactFormInput["interest"], string> = {
  demo: "Request a Live Demo",
  quote: "Construction Monitoring Quote",
  enterprise: "Enterprise Deployment",
  matterport: "Virtual Tour Services",
  partnership: "Partner With Us",
  support: "Technical Support",
  other: "Other",
};

export function formatContactEmailBody(data: ContactFormInput): string {
  const interest = interestLabels[data.interest];

  return [
    `New contact inquiry from ${data.name}`,
    "",
    `Email: ${data.email}`,
    `Company: ${data.company || "Not provided"}`,
    `Interest: ${interest}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}
