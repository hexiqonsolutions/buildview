import { z } from "zod";
import { email, optionalText, personName, text } from "@/lib/validations/primitives";

export const CONTACT_INTERESTS = [
  "construction",
  "real-estate",
  "interior",
  "demo",
  "quote",
  "enterprise",
  "matterport",
  "partnership",
  "support",
  "other",
] as const;

export const contactFormSchema = z
  .object({
    name: personName("Full name"),
    email: email(),
    company: optionalText("Company", { max: 120 }),
    phone: optionalText("Phone", { max: 40 }),
    interest: z.enum(CONTACT_INTERESTS, {
      errorMap: () => ({ message: "Please select what you're interested in" }),
    }),
    projectType: optionalText("Project type", { max: 120 }),
    projectLocation: optionalText("Project location", { max: 160 }),
    message: text("Message", { min: 10, max: 5000, multiline: true }),
    /** Honeypot — must be empty (filled-in submissions are dropped before validation). */
    _gotcha: z.literal("").optional(),
  })
  .strict();

type ContactFormInput = z.infer<typeof contactFormSchema>;

const interestLabels: Record<ContactFormInput["interest"], string> = {
  construction: "Construction Intelligence",
  interior: "Interior Showcase",
  "real-estate": "Real Estate Showcase",
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
    `Phone: ${data.phone || "Not provided"}`,
    `Company: ${data.company || "Not provided"}`,
    `Service interested in: ${interest}`,
    `Project type: ${data.projectType || "Not provided"}`,
    `Project location: ${data.projectLocation || "Not provided"}`,
    "",
    "Message:",
    data.message,
  ].join("\n");
}
