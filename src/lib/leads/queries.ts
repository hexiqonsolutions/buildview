import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LeadFilters } from "@/lib/leads/schema";

export type LeadListItem = {
  id: string;
  company: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  designation: string | null;
  leadSource: string | null;
  priority: string;
  status: string;
  projectType: string | null;
  budget: number | null;
  expectedRevenue: number | null;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; fullName: string | null; email: string } | null;
  tags: { id: string; name: string; color: string | null }[];
  documentCount: number;
};

function toNumber(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

function buildWhere(
  organizationId: string,
  filters: LeadFilters
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    organizationId,
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.leadSource) {
    where.leadSource = { equals: filters.leadSource, mode: "insensitive" };
  }
  if (filters.industry) {
    where.industry = { equals: filters.industry, mode: "insensitive" };
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { company: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { leadSource: { contains: q, mode: "insensitive" } },
      { projectType: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

function mapLead(
  lead: Prisma.LeadGetPayload<{
    include: {
      owner: { select: { id: true; fullName: true; email: true } };
      tags: { include: { tag: true } };
      _count: { select: { documents: true } };
    };
  }>
): LeadListItem {
  return {
    id: lead.id,
    company: lead.company,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    linkedin: lead.linkedin,
    website: lead.website,
    industry: lead.industry,
    location: lead.location,
    designation: lead.designation,
    leadSource: lead.leadSource,
    priority: lead.priority,
    status: lead.status,
    projectType: lead.projectType,
    budget: toNumber(lead.budget),
    expectedRevenue: toNumber(lead.expectedRevenue),
    notes: lead.notes,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    owner: lead.owner,
    tags: lead.tags.map((row) => ({
      id: row.tag.id,
      name: row.tag.name,
      color: row.tag.color,
    })),
    documentCount: lead._count.documents,
  };
}

export async function listLeads(organizationId: string, filters: LeadFilters) {
  const where = buildWhere(organizationId, filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        tags: { include: { tag: true } },
        _count: { select: { documents: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: filters.pageSize,
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    items: rows.map(mapLead),
  };
}

export async function getLeadFilterOptions(organizationId: string) {
  const [sources, industries, tags] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId, deletedAt: null, leadSource: { not: null } },
      distinct: ["leadSource"],
      select: { leadSource: true },
      orderBy: { leadSource: "asc" },
      take: 100,
    }),
    prisma.lead.findMany({
      where: { organizationId, deletedAt: null, industry: { not: null } },
      distinct: ["industry"],
      select: { industry: true },
      orderBy: { industry: "asc" },
      take: 100,
    }),
    prisma.tag.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return {
    sources: sources
      .map((row) => row.leadSource)
      .filter((value): value is string => Boolean(value)),
    industries: industries
      .map((row) => row.industry)
      .filter((value): value is string => Boolean(value)),
    tags,
  };
}

export async function getLeadById(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, deletedAt: null },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { documents: true } },
    },
  });

  return lead ? mapLead(lead) : null;
}

export async function listLeadsForExport(
  organizationId: string,
  filters: LeadFilters
) {
  const where = buildWhere(organizationId, filters);
  const rows = await prisma.lead.findMany({
    where,
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      tags: { include: { tag: true } },
      _count: { select: { documents: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 5000,
  });
  return rows.map(mapLead);
}
