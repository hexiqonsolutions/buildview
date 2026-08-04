import {
  ActivityType,
  LeadStatus,
  Prisma,
} from "@prisma/client";
import { format, subDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  getReportRangeBounds,
  money,
  percent,
  statusLabel,
  type ReportRange,
} from "@/lib/reports/schema";

const PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
];

const ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.CALL,
  ActivityType.MEETING,
  ActivityType.EMAIL,
  ActivityType.TASK,
  ActivityType.NOTE,
];

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "danger" | "success";
};

export type ReportPipelineStage = {
  status: LeadStatus;
  label: string;
  count: number;
  value: number;
  percent: number;
};

export type ReportActivitySlice = {
  type: ActivityType;
  label: string;
  count: number;
};

export type ReportTrendPoint = {
  date: string;
  leads: number;
  won: number;
  revenue: number;
};

export type ReportSourceRow = {
  source: string;
  count: number;
  won: number;
  revenue: number;
};

export type ReportOwnerRow = {
  ownerId: string | null;
  ownerName: string;
  leads: number;
  won: number;
  lost: number;
  pipelineValue: number;
};

export type ReportsData = {
  range: ReportRange;
  rangeLabel: string;
  kpis: ReportKpi[];
  pipeline: ReportPipelineStage[];
  activities: ReportActivitySlice[];
  trend: ReportTrendPoint[];
  sources: ReportSourceRow[];
  owners: ReportOwnerRow[];
};

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (!value) return 0;
  return Number(value);
}

function emptyReports(range: ReportRange, rangeLabel: string): ReportsData {
  const now = new Date();
  const dayCount =
    range === "all" ? 14 : getReportRangeBounds(range, now).dayCount || 14;

  return {
    range,
    rangeLabel,
    kpis: [
      { id: "leads", label: "Leads created", value: "0", helper: rangeLabel },
      { id: "won", label: "Won deals", value: "0", helper: rangeLabel, tone: "success" },
      { id: "lost", label: "Lost deals", value: "0", helper: rangeLabel, tone: "danger" },
      { id: "winrate", label: "Win rate", value: "0%", helper: "Won ÷ (Won + Lost)" },
      {
        id: "pipeline",
        label: "Open pipeline",
        value: "$0",
        helper: "Current open value",
        tone: "success",
      },
      {
        id: "wonrev",
        label: "Won revenue",
        value: "$0",
        helper: rangeLabel,
        tone: "success",
      },
    ],
    pipeline: PIPELINE_STAGES.map((status) => ({
      status,
      label: statusLabel(status),
      count: 0,
      value: 0,
      percent: 0,
    })),
    activities: ACTIVITY_TYPES.map((type) => ({
      type,
      label: statusLabel(type),
      count: 0,
    })),
    trend: Array.from({ length: Math.min(dayCount, 90) }).map((_, index) => {
      const day = subDays(now, Math.min(dayCount, 90) - 1 - index);
      return {
        date: format(day, "MMM d"),
        leads: 0,
        won: 0,
        revenue: 0,
      };
    }),
    sources: [],
    owners: [],
  };
}

export async function getReportsData(
  organizationId: string,
  range: ReportRange
): Promise<ReportsData> {
  const now = new Date();
  const bounds = getReportRangeBounds(range, now);
  const createdFilter = bounds.start
    ? { gte: bounds.start, lte: bounds.end }
    : { lte: bounds.end };
  const updatedFilter = createdFilter;

  try {
    const [
      leadsInRange,
      currentLeads,
      activitiesInRange,
      wonInRange,
      lostInRange,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: {
          organizationId,
          deletedAt: null,
          createdAt: createdFilter,
        },
        select: {
          id: true,
          status: true,
          leadSource: true,
          expectedRevenue: true,
          createdAt: true,
          ownerId: true,
          owner: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.lead.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          status: true,
          expectedRevenue: true,
          ownerId: true,
          owner: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.activity.groupBy({
        by: ["type"],
        where: {
          organizationId,
          deletedAt: null,
          occurredAt: createdFilter,
        },
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: LeadStatus.WON,
          updatedAt: updatedFilter,
        },
        select: {
          expectedRevenue: true,
          updatedAt: true,
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          deletedAt: null,
          status: LeadStatus.LOST,
          updatedAt: updatedFilter,
        },
      }),
    ]);

    const leadsCreated = leadsInRange.length;
    const wonCount = wonInRange.length;
    const lostCount = lostInRange;
    const closed = wonCount + lostCount;
    const winRate = closed === 0 ? 0 : wonCount / closed;
    const wonRevenue = wonInRange.reduce(
      (sum, lead) => sum + decimalToNumber(lead.expectedRevenue),
      0
    );

    const openStatuses: LeadStatus[] = [
      LeadStatus.NEW,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.PROPOSAL,
      LeadStatus.NEGOTIATION,
    ];
    const openPipelineValue = currentLeads
      .filter((lead) => openStatuses.includes(lead.status))
      .reduce((sum, lead) => sum + decimalToNumber(lead.expectedRevenue), 0);

    const pipelineCounts = new Map<LeadStatus, { count: number; value: number }>();
    for (const status of PIPELINE_STAGES) {
      pipelineCounts.set(status, { count: 0, value: 0 });
    }
    for (const lead of currentLeads) {
      const bucket = pipelineCounts.get(lead.status);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.value += decimalToNumber(lead.expectedRevenue);
    }
    const pipelineTotal = Array.from(pipelineCounts.values()).reduce(
      (sum, row) => sum + row.count,
      0
    );
    const pipeline: ReportPipelineStage[] = PIPELINE_STAGES.map((status) => {
      const row = pipelineCounts.get(status)!;
      return {
        status,
        label: statusLabel(status),
        count: row.count,
        value: row.value,
        percent:
          pipelineTotal === 0 ? 0 : Math.round((row.count / pipelineTotal) * 100),
      };
    });

    const activityMap = new Map(
      activitiesInRange.map((row) => [row.type, row._count._all])
    );
    const activities: ReportActivitySlice[] = ACTIVITY_TYPES.map((type) => ({
      type,
      label: statusLabel(type),
      count: activityMap.get(type) ?? 0,
    }));

    const trendDays =
      range === "all"
        ? 30
        : Math.min(bounds.dayCount || 30, 90);
    const trendStart = startOfDay(subDays(now, trendDays - 1));
    const trendMap = new Map<string, ReportTrendPoint>();
    for (let i = 0; i < trendDays; i += 1) {
      const day = subDays(now, trendDays - 1 - i);
      const key = format(day, "yyyy-MM-dd");
      trendMap.set(key, {
        date: format(day, "MMM d"),
        leads: 0,
        won: 0,
        revenue: 0,
      });
    }
    for (const lead of leadsInRange) {
      if (lead.createdAt < trendStart) continue;
      const key = format(lead.createdAt, "yyyy-MM-dd");
      const point = trendMap.get(key);
      if (!point) continue;
      point.leads += 1;
      point.revenue += decimalToNumber(lead.expectedRevenue);
    }
    for (const lead of wonInRange) {
      if (lead.updatedAt < trendStart) continue;
      const key = format(lead.updatedAt, "yyyy-MM-dd");
      const point = trendMap.get(key);
      if (point) point.won += 1;
    }

    const sourceMap = new Map<
      string,
      { count: number; won: number; revenue: number }
    >();
    for (const lead of leadsInRange) {
      const source = lead.leadSource?.trim() || "Unspecified";
      const row = sourceMap.get(source) || { count: 0, won: 0, revenue: 0 };
      row.count += 1;
      row.revenue += decimalToNumber(lead.expectedRevenue);
      if (lead.status === LeadStatus.WON) row.won += 1;
      sourceMap.set(source, row);
    }
    const sources: ReportSourceRow[] = Array.from(sourceMap.entries())
      .map(([source, row]) => ({ source, ...row }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const ownerMap = new Map<
      string,
      ReportOwnerRow
    >();
    for (const lead of currentLeads) {
      const key = lead.ownerId || "unassigned";
      const existing = ownerMap.get(key) || {
        ownerId: lead.ownerId,
        ownerName: lead.owner
          ? lead.owner.fullName || lead.owner.email
          : "Unassigned",
        leads: 0,
        won: 0,
        lost: 0,
        pipelineValue: 0,
      };
      existing.leads += 1;
      if (lead.status === LeadStatus.WON) existing.won += 1;
      if (lead.status === LeadStatus.LOST) existing.lost += 1;
      if (openStatuses.includes(lead.status)) {
        existing.pipelineValue += decimalToNumber(lead.expectedRevenue);
      }
      ownerMap.set(key, existing);
    }
    const owners = Array.from(ownerMap.values()).sort(
      (a, b) => b.leads - a.leads
    );

    const activityTotal = activities.reduce((sum, row) => sum + row.count, 0);

    return {
      range,
      rangeLabel: bounds.label,
      kpis: [
        {
          id: "leads",
          label: "Leads created",
          value: String(leadsCreated),
          helper: bounds.label,
        },
        {
          id: "won",
          label: "Won deals",
          value: String(wonCount),
          helper: bounds.label,
          tone: "success",
        },
        {
          id: "lost",
          label: "Lost deals",
          value: String(lostCount),
          helper: bounds.label,
          tone: lostCount > 0 ? "danger" : "default",
        },
        {
          id: "winrate",
          label: "Win rate",
          value: percent(winRate),
          helper: closed === 0 ? "No closed deals" : `${wonCount} of ${closed} closed`,
          tone: winRate >= 0.4 ? "success" : "warning",
        },
        {
          id: "pipeline",
          label: "Open pipeline",
          value: money(openPipelineValue),
          helper: "Current open value",
          tone: "success",
        },
        {
          id: "wonrev",
          label: "Won revenue",
          value: money(wonRevenue),
          helper: `${activityTotal} activities in range`,
          tone: "success",
        },
      ],
      pipeline,
      activities,
      trend: Array.from(trendMap.values()),
      sources,
      owners,
    };
  } catch (error) {
    console.error("Reports data failed:", error);
    return emptyReports(range, bounds.label);
  }
}
