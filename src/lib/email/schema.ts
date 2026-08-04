import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const composeEmailSchema = z.object({
  accountId: z.string().uuid(),
  to: z.array(z.string().email()).min(1, "Add at least one recipient"),
  cc: z.array(z.string().email()).default([]),
  bcc: z.array(z.string().email()).default([]),
  subject: z.string().trim().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Body is required"),
  leadId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
  mode: z.enum(["send", "draft", "schedule"]).default("send"),
  scheduledAt: z.preprocess(emptyToUndefined, z.string().optional()),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        mimeType: z.string(),
        contentBase64: z.string(),
        sizeBytes: z.number().int().nonnegative(),
      })
    )
    .default([]),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  bodyHtml: z.string().min(1),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  bodyHtml: z.string().min(1),
  scheduledAt: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type ComposeEmailInput = z.infer<typeof composeEmailSchema>;
