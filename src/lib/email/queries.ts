import { EmailMessageStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EmailFolder =
  | "inbox"
  | "sent"
  | "drafts"
  | "scheduled"
  | "templates"
  | "campaigns";

export type EmailListItem = {
  id: string;
  subject: string;
  snippet: string;
  fromAddress: string;
  toAddresses: string[];
  status: EmailMessageStatus;
  direction: string;
  createdAt: string;
  sentAt: string | null;
  scheduledAt: string | null;
  threadId: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
};

function folderWhere(
  organizationId: string,
  emailAccountId: string | null,
  folder: EmailFolder
): Prisma.EmailMessageWhereInput | null {
  if (!emailAccountId) return null;

  const base: Prisma.EmailMessageWhereInput = {
    organizationId,
    emailAccountId,
    deletedAt: null,
  };

  if (folder === "inbox") {
    return { ...base, status: "INBOX", direction: "INBOUND" };
  }
  if (folder === "sent") {
    return { ...base, status: "SENT" };
  }
  if (folder === "drafts") {
    return { ...base, status: "DRAFT" };
  }
  if (folder === "scheduled") {
    return { ...base, status: "SCHEDULED" };
  }
  return null;
}

export async function listEmailMessages(options: {
  organizationId: string;
  emailAccountId: string | null;
  folder: EmailFolder;
  q?: string;
}) {
  const where = folderWhere(
    options.organizationId,
    options.emailAccountId,
    options.folder
  );
  if (!where) {
    return [] as EmailListItem[];
  }

  if (options.q?.trim()) {
    where.OR = [
      { subject: { contains: options.q.trim(), mode: "insensitive" } },
      { bodyText: { contains: options.q.trim(), mode: "insensitive" } },
      { fromAddress: { contains: options.q.trim(), mode: "insensitive" } },
    ];
  }

  const rows = await prisma.emailMessage.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    snippet: (row.bodyText || row.bodyHtml || "").slice(0, 140),
    fromAddress: row.fromAddress,
    toAddresses: row.toAddresses,
    status: row.status,
    direction: row.direction,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    threadId: row.threadId,
    openCount: row.openCount,
    firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
  }));
}

export async function getEmailMessage(
  organizationId: string,
  messageId: string
) {
  return prisma.emailMessage.findFirst({
    where: { id: messageId, organizationId, deletedAt: null },
    include: {
      attachments: {
        where: { deletedAt: null },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
      thread: true,
      openEvents: {
        orderBy: { openedAt: "desc" },
        take: 20,
        select: {
          id: true,
          openedAt: true,
        },
      },
    },
  });
}

export async function listTemplates(organizationId: string) {
  return prisma.emailTemplate.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listCampaigns(organizationId: string) {
  return prisma.emailCampaign.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listLeadsForPersonalization(organizationId: string) {
  return prisma.lead.findMany({
    where: { organizationId, deletedAt: null, email: { not: null } },
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
      projectType: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}
