import { DocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DocumentFilter } from "@/lib/documents/schema";

export type DocumentListItem = {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  lead: {
    id: string;
    company: string;
    contactName: string;
  } | null;
  uploadedBy: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
};

function mapRow(
  row: Prisma.DocumentGetPayload<{
    include: {
      lead: { select: { id: true; company: true; contactName: true } };
      uploadedBy: { select: { id: true; fullName: true; email: true } };
    };
  }>
): DocumentListItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    lead: row.lead,
    uploadedBy: row.uploadedBy,
  };
}

export async function listDocuments(options: {
  organizationId: string;
  filter: DocumentFilter;
  leadId?: string;
  q?: string;
}) {
  const where: Prisma.DocumentWhereInput = {
    organizationId: options.organizationId,
    deletedAt: null,
  };

  if (options.filter !== "all") {
    where.type = options.filter;
  }
  if (options.leadId) {
    where.leadId = options.leadId;
  }
  if (options.q?.trim()) {
    where.name = { contains: options.q.trim(), mode: "insensitive" };
  }

  const rows = await prisma.document.findMany({
    where,
    include: {
      lead: { select: { id: true, company: true, contactName: true } },
      uploadedBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return rows.map(mapRow);
}

export async function getDocumentCounts(organizationId: string) {
  const groups = await prisma.document.groupBy({
    by: ["type"],
    where: { organizationId, deletedAt: null },
    _count: { _all: true },
  });

  const counts: Record<DocumentType | "all", number> = {
    all: 0,
    PDF: 0,
    PROPOSAL: 0,
    QUOTATION: 0,
    CONTRACT: 0,
    INVOICE: 0,
    IMAGE: 0,
    OTHER: 0,
  };

  for (const row of groups) {
    counts[row.type] = row._count._all;
    counts.all += row._count._all;
  }

  return counts;
}

export async function getDocumentForOrg(options: {
  organizationId: string;
  documentId: string;
}) {
  return prisma.document.findFirst({
    where: {
      id: options.documentId,
      organizationId: options.organizationId,
      deletedAt: null,
    },
  });
}

export async function listLeadsForDocument(organizationId: string) {
  return prisma.lead.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, company: true, contactName: true },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
}
