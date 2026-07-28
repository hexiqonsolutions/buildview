import { getProjectProgressPercent } from "@/lib/utils";

export type TimelineProgressEvent = {
  project_id: string;
  event_date: string;
  progress_percent?: number | null;
};

export type ProgressDistributionItem = {
  name: string;
  value: number;
  percent: number;
};

export type MonthlyProgressPoint = {
  month: string;
  progress: number;
};

export function buildProgressDistribution(
  projects: Array<{ status: string }>
): ProgressDistributionItem[] {
  const categories = {
    Completed: 0,
    "In Progress": 0,
    "On Hold": 0,
    "Not Started": 0,
  };

  projects.forEach((project) => {
    if (project.status === "completed") categories.Completed += 1;
    else if (project.status === "in_progress") categories["In Progress"] += 1;
    else if (project.status === "on_hold") categories["On Hold"] += 1;
    else categories["Not Started"] += 1;
  });

  const total = projects.length || 1;
  return Object.entries(categories).map(([name, value]) => ({
    name,
    value,
    percent: projects.length > 0 ? Math.round((value / total) * 100) : 0,
  }));
}

/** Latest recorded milestone progress per project (falls back to status estimate). */
export function resolveProjectProgressValues(
  projects: Array<{ id: string; status: string }>,
  timelineEvents: TimelineProgressEvent[]
): Map<string, number> {
  const latestByProject = new Map<string, { date: string; progress: number }>();

  for (const event of timelineEvents) {
    if (event.progress_percent == null) continue;
    const existing = latestByProject.get(event.project_id);
    if (!existing || event.event_date >= existing.date) {
      latestByProject.set(event.project_id, {
        date: event.event_date,
        progress: event.progress_percent,
      });
    }
  }

  const result = new Map<string, number>();
  for (const project of projects) {
    const fromTimeline = latestByProject.get(project.id);
    result.set(
      project.id,
      fromTimeline?.progress ?? getProjectProgressPercent(project.status)
    );
  }
  return result;
}

export function averageProgress(progressByProject: Map<string, number>): number {
  const values = [...progressByProject.values()];
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildLastSixMonthLabels(): Array<{
  month: string;
  monthIndex: number;
  year: number;
}> {
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleString("en-IN", { month: "short" }),
      monthIndex: date.getMonth(),
      year: date.getFullYear(),
    };
  });
}

/** Progress trend from timeline milestone percentages (not event counts). */
export function buildProgressTrendFromTimeline(
  projectIds: string[],
  timelineEvents: TimelineProgressEvent[],
  months = buildLastSixMonthLabels()
): MonthlyProgressPoint[] {
  const withProgress = timelineEvents.filter(
    (event): event is TimelineProgressEvent & { progress_percent: number } =>
      event.progress_percent != null
  );

  if (withProgress.length === 0 || projectIds.length === 0) {
    return months.map(({ month }) => ({ month, progress: 0 }));
  }

  let lastKnown = 0;

  return months.map(({ month, monthIndex, year }) => {
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const monthEndIso = monthEnd.toISOString().split("T")[0];

    const values: number[] = [];
    for (const projectId of projectIds) {
      const latest = withProgress
        .filter(
          (event) =>
            event.project_id === projectId && event.event_date <= monthEndIso
        )
        .sort((a, b) => b.event_date.localeCompare(a.event_date))[0];

      if (latest) values.push(latest.progress_percent);
    }

    if (values.length > 0) {
      lastKnown = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    }

    return { month, progress: lastKnown };
  });
}

export function countTimelineEventsByMonth(
  timelineEvents: Array<{ event_date: string }>,
  months = buildLastSixMonthLabels()
): Array<{ month: string; count: number }> {
  return months.map(({ month, monthIndex, year }) => {
    const count = timelineEvents.filter((event) => {
      const date = new Date(event.event_date);
      return date.getMonth() === monthIndex && date.getFullYear() === year;
    }).length;
    return { month, count };
  });
}
