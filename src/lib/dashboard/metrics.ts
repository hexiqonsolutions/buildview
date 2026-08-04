import {
  ActivityType,
  EmailDirection,
  FollowUpStatus,
  LeadStatus,
  Prisma,
} from "@prisma/client";
import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";

const OPEN_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
];

const PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
];

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "danger" | "success";
};

export type PipelineStage = {
  status: LeadStatus;
  label: string;
  count: number;
  percent: number;
};

export type TrendPoint = {
  date: string;
  leads: number;
  revenue: number;
};

export type FollowUpItem = {
  id: string;
  title: string;
  dueAt: string;
  status: FollowUpStatus;
  bucket: "today" | "upcoming" | "overdue";
  leadName: string | null;
};

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  body: string | null;
  occurredAt: string;
  actorName: string | null;
  leadName: string | null;
};

export type DashboardData = {
  kpis: DashboardKpi[];
  pipeline: PipelineStage[];
  trend: TrendPoint[];
  followUps: FollowUpItem[];
  activities: ActivityItem[];
  totals: {
    leads: number;
    openOpportunities: number;
    expectedRevenue: number;
  };
};

function statusLabel(status: LeadStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function emptyDashboard(): DashboardData {
  return {
    kpis: [
      {
        id: "emails",
        label: "Today's Emails",
        value: "0",
        helper: "Inbox + sent today",
      },
      {
        id: "leads",
        label: "Leads Added",
        value: "0",
        helper: "Created today",
      },
      {
        id: "followups",
        label: "Follow-ups",
        value: "0",
        helper: "Due today",
        tone: "warning",
      },
      {
        id: "meetings",
        label: "Meetings",
        value: "0",
        helper: "Logged today",
      },
      {
        id: "revenue",
        label: "Expected Revenue",
        value: "$0",
        helper: "Open pipeline value",
        tone: "success",
      },
      {
        id: "opportunities",
        label: "Open Opportunities",
        value: "0",
        helper: "Active deals",
      },
    ],
    pipeline: PIPELINE_STAGES.map((status) => ({
      status,
      label: statusLabel(status),
      count: 0,
      percent: 0,
    })),
    trend: Array.from({ length: 14 }).map((_, index) => {
      const day = subDays(new Date(), 13 - index);
      return {
        date: format(day, "MMM d"),
        leads: 0,
        revenue: 0,
      };
    }),
    followUps: [],
    activities: [],
    totals: {
      leads: 0,
      openOpportunities: 0,
      expectedRevenue: 0,
    },
  };
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value);
}

export async function getDashboardData(
  organizationId: string
): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const trendStart = startOfDay(subDays(now, 13));

  try {
    const [
      emailsToday,
      leadsToday,
      followUpsDueToday,
      meetingsToday,
      openLeads,
      pipelineGroups,
      recentFollowUps,
      recentActivities,
      trendLeads,
      wonThisMonth,
    ] = await Promise.all([
      prisma.emailMessage.count({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            {
              direction: EmailDirection.INBOUND,
              createdAt: { gte: todayStart, lte: todayEnd },
            },
            {
              direction: EmailDirection.OUTBOUND,
              sentAt: { gte: todayStart, lte: todayEnd },
            },
          ],
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.followUp.count({
        where: {
          organizationId,
          deletedAt: null,
          status: FollowUpStatus.PENDING,
          dueAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.activity.count({
        where: {
          organizationId,
          deletedAt: null,
          type: ActivityType.MEETING,
          occurredAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.lead.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: OPEN_STATUSES },
        },
        select: {
          expectedRevenue: true,
        },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: {
          organizationId,
          deletedAt: null,
          status: { in: PIPELINE_STAGES },
        },
        _count: { _all: true },
      }),
      prisma.followUp.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: FollowUpStatus.PENDING,
        },
        include: {
          lead: { select: { company: true, contactName: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 12,
      }),
      prisma.activity.findMany({
        where: {
          organizationId,
          deletedAt: null,
        },
        include: {
          actor: { select: { fullName: true, email: true } },
          lead: { select: { company: true, contactName: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
      }),
      prisma.lead.findMany({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: { gte: trendStart },
        },
        select: {
          createdAt: true,
          expectedRevenue: true,
          status: true,
        },
      }),
      prisma.lead.aggregate({
        where: {
          organizationId,
          deletedAt: null,
          status: LeadStatus.WON,
          updatedAt: { gte: monthStart },
        },
        _sum: { expectedRevenue: true },
      }),
    ]);

    const expectedRevenue = openLeads.reduce(
      (sum, lead) => sum + decimalToNumber(lead.expectedRevenue),
      0
    );
    const openOpportunities = openLeads.length;
    const wonRevenue = decimalToNumber(wonThisMonth._sum.expectedRevenue);

    const countByStatus = new Map(
      pipelineGroups.map((row) => [row.status, row._count._all])
    );
    const pipelineTotal = PIPELINE_STAGES.reduce(
      (sum, status) => sum + (countByStatus.get(status) ?? 0),
      0
    );

    const pipeline: PipelineStage[] = PIPELINE_STAGES.map((status) => {
      const count = countByStatus.get(status) ?? 0;
      return {
        status,
        label: statusLabel(status),
        count,
        percent: pipelineTotal === 0 ? 0 : Math.round((count / pipelineTotal) * 100),
      };
    });

    const trendMap = new Map<string, TrendPoint>();
    for (let i = 0; i < 14; i += 1) {
      const day = subDays(now, 13 - i);
      const key = format(day, "yyyy-MM-dd");
      trendMap.set(key, {
        date: format(day, "MMM d"),
        leads: 0,
        revenue: 0,
      });
    }

    for (const lead of trendLeads) {
      const key = format(lead.createdAt, "yyyy-MM-dd");
      const point = trendMap.get(key);
      if (!point) continue;
      point.leads += 1;
      point.revenue += decimalToNumber(lead.expectedRevenue);
    }

    const followUps: FollowUpItem[] = recentFollowUps.map((item) => {
      let bucket: FollowUpItem["bucket"] = "upcoming";
      if (item.dueAt < todayStart) bucket = "overdue";
      else if (item.dueAt <= todayEnd) bucket = "today";

      return {
        id: item.id,
        title: item.title,
        dueAt: item.dueAt.toISOString(),
        status: item.status,
        bucket,
        leadName: item.lead
          ? `${item.lead.contactName} · ${item.lead.company}`
          : null,
      };
    });

    const activities: ActivityItem[] = recentActivities.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      occurredAt: item.occurredAt.toISOString(),
      actorName: item.actor?.fullName || item.actor?.email || null,
      leadName: item.lead
        ? `${item.lead.contactName} · ${item.lead.company}`
        : null,
    }));

    const overdueCount = followUps.filter((f) => f.bucket === "overdue").length;

    return {
      kpis: [
        {
          id: "emails",
          label: "Today's Emails",
          value: String(emailsToday),
          helper: "Inbox + sent today",
        },
        {
          id: "leads",
          label: "Leads Added",
          value: String(leadsToday),
          helper: "Created today",
        },
        {
          id: "followups",
          label: "Follow-ups",
          value: String(followUpsDueToday),
          helper:
            overdueCount > 0
              ? `${overdueCount} overdue`
              : "Due today",
          tone: overdueCount > 0 ? "danger" : "warning",
        },
        {
          id: "meetings",
          label: "Meetings",
          value: String(meetingsToday),
          helper: "Logged today",
        },
        {
          id: "revenue",
          label: "Expected Revenue",
          value: money(expectedRevenue),
          helper:
            wonRevenue > 0
              ? `${money(wonRevenue)} won this month`
              : "Open pipeline value",
          tone: "success",
        },
        {
          id: "opportunities",
          label: "Open Opportunities",
          value: String(openOpportunities),
          helper: "Active deals in pipeline",
        },
      ],
      pipeline,
      trend: Array.from(trendMap.values()),
      followUps,
      activities,
      totals: {
        leads: pipelineTotal,
        openOpportunities,
        expectedRevenue,
      },
    };
  } catch (error) {
    console.error("Dashboard metrics failed:", error);
    return emptyDashboard();
  }
}
