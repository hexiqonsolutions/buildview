"use server";

import { MembershipRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/session";
import { EMAIL_AI_SYSTEM, getOpenAI } from "@/lib/ai/openai";
import {
  emailAiActionSchema,
  type EmailAiActionInput,
} from "@/lib/email/ai-schema";
import { htmlToText } from "@/lib/gmail/client";

type AiResult =
  | { ok: true; data: { subject?: string; bodyHtml: string; summary?: string } }
  | { ok: false; error: string };

function stripFences(text: string) {
  return text
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildUserPrompt(input: EmailAiActionInput) {
  const leadBits = [
    input.lead?.contactName ? `Contact: ${input.lead.contactName}` : null,
    input.lead?.company ? `Company: ${input.lead.company}` : null,
    input.lead?.projectType ? `Project: ${input.lead.projectType}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const currentBody = input.bodyHtml
    ? htmlToText(input.bodyHtml)
    : "(empty body)";
  const context = input.contextHtml
    ? htmlToText(input.contextHtml)
    : undefined;

  switch (input.action) {
    case "generate":
      return `Generate a professional construction-sales email.
Subject hint: ${input.subject || "(none)"}
User brief: ${input.prompt || "Introduce BuildView CRM follow-up on a construction opportunity."}
${leadBits ? `Lead context:\n${leadBits}` : ""}
Return JSON with keys subject and bodyHtml.`;
    case "improve":
      return `Improve grammar, clarity, and professionalism of this email body. Keep meaning.
Subject: ${input.subject || ""}
Body:
${currentBody}
Return JSON with keys subject and bodyHtml.`;
    case "rewrite":
      return `Rewrite this email with clearer structure and stronger sales writing, same intent.
Subject: ${input.subject || ""}
Body:
${currentBody}
Return JSON with keys subject and bodyHtml.`;
    case "shorten":
      return `Shorten this email while keeping the ask and key facts.
Subject: ${input.subject || ""}
Body:
${currentBody}
Return JSON with keys subject and bodyHtml.`;
    case "expand":
      return `Expand this email with helpful detail and a clear next step, still concise for busy PMs.
Subject: ${input.subject || ""}
Body:
${currentBody}
Return JSON with keys subject and bodyHtml.`;
    case "tone":
      return `Change the tone to ${input.tone || "professional"}.
Subject: ${input.subject || ""}
Body:
${currentBody}
Return JSON with keys subject and bodyHtml.`;
    case "summarize":
      return `Summarize this received email for a salesperson in 3-5 bullet points as HTML (<ul><li>...).
Email:
${context || currentBody}
Return JSON with keys summary (HTML) and bodyHtml (same as summary).`;
    case "reply":
      return `Draft a professional reply to this inbound email. Do not send it.
Inbound email:
${context || currentBody}
${leadBits ? `Lead context:\n${leadBits}` : ""}
Return JSON with keys subject and bodyHtml.`;
    default:
      return currentBody;
  }
}

export async function runEmailAiAction(input: unknown): Promise<AiResult> {
  try {
    await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    const parsed = emailAiActionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid AI request" };
    }

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EMAIL_AI_SYSTEM },
        {
          role: "user",
          content: `${buildUserPrompt(parsed.data)}

Important: Respond ONLY with a JSON object. Never send email. The user will review before sending.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "Empty AI response" };

    let json: { subject?: string; bodyHtml?: string; summary?: string };
    try {
      json = JSON.parse(stripFences(raw));
    } catch {
      return { ok: false, error: "AI returned invalid JSON" };
    }

    const bodyHtml = stripFences(json.bodyHtml || json.summary || "");
    if (!bodyHtml) {
      return { ok: false, error: "AI did not return email content" };
    }

    return {
      ok: true,
      data: {
        subject: json.subject,
        bodyHtml,
        summary: json.summary,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "AI assistant failed. Check OPENAI_API_KEY.",
    };
  }
}
