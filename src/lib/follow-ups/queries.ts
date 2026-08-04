import { FollowUpStatus, Prisma } from "@prisma/client";
import {
  endOfDay,
  startOfDay,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import type { FollowUpBucket } from "@/lib/follow-ups/schema";

export type FollowUpListItem = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string;
  status: FollowUpStatus;
  remindedAt: string | null;
  completedAt: string | null;
  bucket: "today" | "upcoming" | "overdue" | "done";
  lead: {
    id: string;
    company: string;
    contactName: string;
    email: string | null;
  };
  assignee: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
};

function bucketFor(dueAt: Date, status: FollowUpStatus): FollowUpListItem["bucket"] {
  if (status === FollowUpStatus.DONE || status === FollowUpStatus.CANCELLED) {
    return "done";
  }
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (dueAt < todayStart) return "overdue";
  if (dueAt <= todayEnd) return "today";
  return "upcoming";
}

function mapRow(
  row: Prisma.FollowUpGetPayload<{
    include: {
      lead: {
        select: {
          id: true;
          company: true;
          contactName: true;
          email: true;
        };
      };
      assignee: { select: { id: true; fullName: true; email: true } };
    };
  }>
): FollowUpListItem {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    dueAt: row.dueAt.toISOString(),
    status: row.status,
    remindedAt: row.remindedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    bucket: bucketFor(row.dueAt, row.status),
    lead: row.lead,
    assignee: row.assignee,
  };
}

function whereForBucket(
  organizationId: string,
  bucket: FollowUpBucket,
  userId?: string
): Prisma.FollowUpWhereInput {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const base: Prisma.FollowUpWhereInput = {
    organizationId,
    deletedAt: null,
    ...(userId
      ? {
          OR: [{ assigneeId: userId }, { assigneeId: null }],
        }
      : {}),
  };

  if (bucket === "all") {
    return { ...base, status: FollowUpStatus.PENDING };
  }
  if (bucket === "done") {
    return {
      ...base,
      status: { in: [FollowUpStatus.DONE, FollowUpStatus.CANCELLED] },
    };
  }
  if (bucket === "overdue") {
    return {
      ...base,
      status: FollowUpStatus.PENDING,
      dueAt: { lt: todayStart },
    };
  }
  if (bucket === "today") {
    return {
      ...base,
      status: FollowUpStatus.PENDING,
      dueAt: { gte: todayStart, lte: todayEnd },
    };
  }
  return {
    ...base,
    status: FollowUpStatus.PENDING,
    dueAt: { gt: todayEnd },
  };
}

export async function listFollowUps(options: {
  organizationId: string;
  bucket: FollowUpBucket;
  userId?: string;
}) {
  const rows = await prisma.followUp.findMany({
    where: whereForBucket(
      options.organizationId,
      options.bucket,
      options.userId
    ),
    include: {
      lead: {
        select: {
          id: true,
          company: true,
          contactName: true,
          email: true,
        },
      },
      assignee: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ dueAt: options.bucket === "done" ? "desc" : "asc" }],
    take: 200,
  });

  return rows.map(mapRow);
}

export async function getFollowUpCounts(organizationId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const base = {
    organizationId,
    deletedAt: null,
    status: FollowUpStatus.PENDING,
  } as const;

  const [today, upcoming, overdue] = await Promise.all([
    prisma.followUp.count({
      where: { ...base, dueAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.followUp.count({
      where: { ...base, dueAt: { gt: todayEnd } },
    }),
    prisma.followUp.count({
      where: { ...base, dueAt: { lt: todayStart } },
    }),
  ]);

  return { today, upcoming, overdue };
}

export async function listLeadsForFollowUp(organizationId: string) {
  return prisma.lead.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
}

export async function getReminderCandidates(
  organizationId: string,
  userId: string
) {
  const now = new Date();
  const todayEnd = endOfDay(now);
  const remindAfter = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const rows = await prisma.followUp.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: FollowUpStatus.PENDING,
      dueAt: { lte: todayEnd },
      OR: [{ assigneeId: userId }, { assigneeId: null }],
      AND: [
        {
          OR: [{ remindedAt: null }, { remindedAt: { lt: remindAfter } }],
        },
      ],
    },
    include: {
      lead: {
        select: { company: true, contactName: true },
      },
    },
    orderBy: { dueAt: "asc" },
    take: 20,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt.toISOString(),
    bucket: bucketFor(row.dueAt, row.status),
    leadLabel: `${row.lead.contactName} · ${row.lead.company}`,
  }));
}
