import { z } from "zod";

export const emailAiActionSchema = z.object({
  action: z.enum([
    "generate",
    "improve",
    "rewrite",
    "shorten",
    "expand",
    "tone",
    "summarize",
    "reply",
  ]),
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
  tone: z.enum(["professional", "friendly", "assertive"]).optional(),
  contextHtml: z.string().optional(),
  lead: z
    .object({
      contactName: z.string().optional(),
      company: z.string().optional(),
      projectType: z.string().optional(),
    })
    .optional(),
  prompt: z.string().optional(),
});

export type EmailAiActionInput = z.infer<typeof emailAiActionSchema>;
