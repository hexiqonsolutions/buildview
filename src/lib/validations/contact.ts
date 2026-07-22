import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  interest: z.enum(["demo", "pricing", "partnership", "support", "other"], {
    required_error: "Please select what you're interested in",
  }),
  message: z.string().min(10, "Please provide a bit more detail in your message"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

const interestLabels: Record<ContactFormInput["interest"], string> = {
  demo: "Book a demo",
  pricing: "Pricing information",
  partnership: "Partnership",
  support: "Support",
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
