"use server";

import { revalidatePath } from "next/cache";
import { MembershipRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import {
  applyPersonalization,
  buildRawEmail,
  htmlToText,
} from "@/lib/gmail/client";
import { getAuthorizedGmail, syncGmailInbox } from "@/lib/gmail/sync";
import {
  createTrackingToken,
  injectTrackingPixel,
} from "@/lib/email/tracking";
import {
  campaignSchema,
  composeEmailSchema,
  templateSchema,
} from "@/lib/email/schema";

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function assertAccountAccess(
  organizationId: string,
  userId: string,
  accountId: string
) {
  const account = await prisma.emailAccount.findFirst({
    where: {
      id: accountId,
      organizationId,
      userId,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!account) throw new Error("Email account not found");
  return account;
}

export async function syncInboxAction(
  accountId: string
): Promise<ActionResult<{ synced: number; scanned: number }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    await assertAccountAccess(
      session.organization.id,
      session.user.id,
      accountId
    );
    const result = await syncGmailInbox(accountId);
    revalidatePath("/email");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to sync Gmail inbox",
    };
  }
}

export async function composeEmailAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = composeEmailSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid email",
      };
    }

    const data = parsed.data;
    const account = await assertAccountAccess(
      session.organization.id,
      session.user.id,
      data.accountId
    );

    let bodyHtml = data.bodyHtml;
    let subject = data.subject;
    let to = data.to;

    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          id: data.leadId,
          organizationId: session.organization.id,
          deletedAt: null,
        },
      });
      if (lead) {
        const vars = {
          Name: lead.contactName,
          Company: lead.company,
          Project: lead.projectType || "",
        };
        bodyHtml = applyPersonalization(bodyHtml, vars);
        subject = applyPersonalization(subject, vars);
        if (lead.email && !to.includes(lead.email)) {
          to = [lead.email, ...to];
        }
      }
    }

    const bodyText = htmlToText(bodyHtml);
    const scheduledAt =
      data.mode === "schedule" && data.scheduledAt
        ? new Date(data.scheduledAt)
        : null;

    if (data.mode === "schedule" && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
      return { ok: false, error: "Choose a valid schedule time" };
    }

    let replyMeta: {
      threadId?: string;
      gmailThreadId?: string | null;
      inReplyTo?: string;
    } = {};

    if (data.replyToMessageId) {
      const original = await prisma.emailMessage.findFirst({
        where: {
          id: data.replyToMessageId,
          organizationId: session.organization.id,
          deletedAt: null,
        },
        include: { thread: true },
      });
      if (original) {
        replyMeta = {
          threadId: original.threadId || undefined,
          gmailThreadId: original.thread?.gmailThreadId,
          inReplyTo: original.gmailMessageId || undefined,
        };
      }
    }

    if (data.mode === "draft" || data.mode === "schedule") {
      const message = await prisma.emailMessage.create({
        data: {
          organizationId: session.organization.id,
          emailAccountId: account.id,
          authorId: session.user.id,
          threadId: replyMeta.threadId,
          direction: "OUTBOUND",
          status: data.mode === "draft" ? "DRAFT" : "SCHEDULED",
          fromAddress: account.email,
          toAddresses: to,
          ccAddresses: data.cc,
          bccAddresses: data.bcc,
          subject,
          bodyHtml,
          bodyText,
          scheduledAt,
          attachments: data.attachments.length
            ? {
                create: data.attachments.map((file) => ({
                  fileName: file.filename,
                  mimeType: file.mimeType,
                  sizeBytes: file.sizeBytes,
                  storagePath: `inline://${file.filename}`,
                })),
              }
            : undefined,
        },
      });

      revalidatePath("/email");
      return { ok: true, data: { id: message.id } };
    }

    // Send now via Gmail (pixel only in outbound MIME — not in stored body)
    const trackingToken = createTrackingToken();
    const trackedHtml = injectTrackingPixel(bodyHtml, trackingToken);
    const { gmail } = await getAuthorizedGmail(account.id);
    const raw = buildRawEmail({
      from: account.email,
      to,
      cc: data.cc,
      bcc: data.bcc,
      subject,
      html: trackedHtml,
      text: bodyText,
      threadId: replyMeta.gmailThreadId || undefined,
      inReplyTo: replyMeta.inReplyTo,
      references: replyMeta.inReplyTo,
      attachments: data.attachments.map((file) => ({
        filename: file.filename,
        mimeType: file.mimeType,
        contentBase64: file.contentBase64,
      })),
    });

    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId: replyMeta.gmailThreadId || undefined,
      },
    });

    let threadId = replyMeta.threadId;
    if (sent.data.threadId) {
      const thread = await prisma.emailThread.upsert({
        where: {
          emailAccountId_gmailThreadId: {
            emailAccountId: account.id,
            gmailThreadId: sent.data.threadId,
          },
        },
        update: {
          subject,
          snippet: bodyText.slice(0, 140),
          lastMessageAt: new Date(),
          leadId: data.leadId,
          deletedAt: null,
        },
        create: {
          organizationId: session.organization.id,
          emailAccountId: account.id,
          gmailThreadId: sent.data.threadId,
          subject,
          snippet: bodyText.slice(0, 140),
          lastMessageAt: new Date(),
          leadId: data.leadId,
        },
      });
      threadId = thread.id;
    }

    const message = await prisma.emailMessage.create({
      data: {
        organizationId: session.organization.id,
        emailAccountId: account.id,
        authorId: session.user.id,
        threadId,
        gmailMessageId: sent.data.id || null,
        direction: "OUTBOUND",
        status: "SENT",
        fromAddress: account.email,
        toAddresses: to,
        ccAddresses: data.cc,
        bccAddresses: data.bcc,
        subject,
        bodyHtml,
        bodyText,
        sentAt: new Date(),
        trackingToken,
        openCount: 0,
        attachments: data.attachments.length
          ? {
              create: data.attachments.map((file) => ({
                fileName: file.filename,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                storagePath: `inline://${file.filename}`,
              })),
            }
          : undefined,
      },
    });

    if (data.leadId) {
      await prisma.activity.create({
        data: {
          organizationId: session.organization.id,
          leadId: data.leadId,
          actorId: session.user.id,
          type: "EMAIL",
          title: `Email sent: ${subject}`,
          body: bodyText.slice(0, 500),
        },
      });
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { lastContactedAt: new Date() },
      });
    }

    revalidatePath("/email");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
    return { ok: true, data: { id: message.id } };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function sendScheduledEmailAction(
  messageId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);

    const message = await prisma.emailMessage.findFirst({
      where: {
        id: messageId,
        organizationId: session.organization.id,
        status: "SCHEDULED",
        deletedAt: null,
      },
      include: { attachments: true },
    });
    if (!message) return { ok: false, error: "Scheduled message not found" };

    const { gmail, account } = await getAuthorizedGmail(message.emailAccountId);
    const trackingToken = message.trackingToken || createTrackingToken();
    const trackedHtml = injectTrackingPixel(
      message.bodyHtml || "",
      trackingToken
    );
    const raw = buildRawEmail({
      from: account.email,
      to: message.toAddresses,
      cc: message.ccAddresses,
      bcc: message.bccAddresses,
      subject: message.subject,
      html: trackedHtml,
      text: message.bodyText || undefined,
    });

    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    await prisma.emailMessage.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        gmailMessageId: sent.data.id || null,
        sentAt: new Date(),
        scheduledAt: null,
        trackingToken,
      },
    });

    revalidatePath("/email");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to send scheduled email" };
  }
}

export async function saveTemplateAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = templateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid template" };
    }

    const created = await prisma.emailTemplate.create({
      data: {
        organizationId: session.organization.id,
        name: parsed.data.name,
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        variables: ["Name", "Company", "Project"],
      },
    });

    revalidatePath("/email");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to save template" };
  }
}

export async function saveCampaignAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    const parsed = campaignSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid campaign" };
    }

    const created = await prisma.emailCampaign.create({
      data: {
        organizationId: session.organization.id,
        name: parsed.data.name,
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        status: parsed.data.scheduledAt ? "scheduled" : "draft",
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt)
          : null,
      },
    });

    revalidatePath("/email");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to save campaign" };
  }
}

export async function disconnectGmailAction(
  accountId: string
): Promise<ActionResult> {
  try {
    const session = await requireRole([
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.SALES,
    ]);
    await prisma.emailAccount.updateMany({
      where: {
        id: accountId,
        organizationId: session.organization.id,
        userId: session.user.id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        accessTokenEnc: null,
        refreshTokenEnc: null,
      },
    });
    revalidatePath("/email");
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Failed to disconnect Gmail" };
  }
}
