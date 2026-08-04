import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActivityFilter } from "@/lib/activities/schema";

export type ActivityListItem = {
  id: string;
  type: ActivityType;
  title: string;
  body: string | null;
  occurredAt: string;
  lead: {
    id: string;
    company: string;
    contactName: string;
  } | null;
  actor: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
};

function mapRow(
  row: Prisma.ActivityGetPayload<{
    include: {
      lead: { select: { id: true; company: true; contactName: true } };
      actor: { select: { id: true; fullName: true; email: true } };
    };
  }>
): ActivityListItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    occurredAt: row.occurredAt.toISOString(),
    lead: row.lead,
    actor: row.actor,
  };
}

export async function listActivities(options: {
  organizationId: string;
  filter: ActivityFilter;
  leadId?: string;
  q?: string;
}) {
  const where: Prisma.ActivityWhereInput = {
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
    where.OR = [
      { title: { contains: options.q.trim(), mode: "insensitive" } },
      { body: { contains: options.q.trim(), mode: "insensitive" } },
    ];
  }

  const rows = await prisma.activity.findMany({
    where,
    include: {
      lead: { select: { id: true, company: true, contactName: true } },
      actor: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 150,
  });

  return rows.map(mapRow);
}

export async function getActivityCounts(organizationId: string) {
  const groups = await prisma.activity.groupBy({
    by: ["type"],
    where: { organizationId, deletedAt: null },
    _count: { _all: true },
  });

  const counts: Record<ActivityType | "all", number> = {
    all: 0,
    CALL: 0,
    MEETING: 0,
    EMAIL: 0,
    TASK: 0,
    NOTE: 0,
  };

  for (const row of groups) {
    counts[row.type] = row._count._all;
    counts.all += row._count._all;
  }

  return counts;
}

export async function listLeadsForActivity(organizationId: string) {
  return prisma.lead.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, company: true, contactName: true },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
}
