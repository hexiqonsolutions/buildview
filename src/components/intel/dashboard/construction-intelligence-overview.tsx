import type { ReactNode } from "react";
import Link from "next/link";
import { PortalWelcomeBanner } from "@/components/portal/portal-dashboard";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import {
  PortalOverallProgressDonut,
  PortalProgressTrendChart,
} from "@/components/portal/portal-charts";
import { ConstructionLatestTourCard } from "@/components/intel/dashboard/construction-latest-tour";
import { ConstructionProjectList } from "@/components/intel/dashboard/construction-project-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime, formatStatus, getStatusColor } from "@/lib/utils";
import type { ClientDashboardData } from "@/lib/data/dashboard";
import {
  AlertTriangle,
  FileText,
  FolderOpen,
  Calendar,
  FolderKanban,
  Camera,
  Activity,
  CheckCircle2,
  PauseCircle,
  CircleDashed,
} from "lucide-react";

interface ConstructionIntelligenceOverviewProps {
  firstName: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  data: ClientDashboardData;
  workspaceQuery?: string;
  canUpdateStatus?: boolean;
}

/**
 * Construction Intelligence home — dense vertical stack.
 * No side-by-side stretch columns (those caused overlapping / floating charts).
 */
export function ConstructionIntelligenceOverview({
  firstName,
  fullName,
  email,
  avatarUrl,
  data,
  workspaceQuery = "",
  canUpdateStatus = false,
}: ConstructionIntelligenceOverviewProps) {
  const q = workspaceQuery || "";
  const displayProjects = [...data.projects].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.name.localeCompare(b.name);
  });

  const completedCount = data.projects.filter((p) => p.status === "completed").length;
  const onHoldCount = data.projects.filter((p) => p.status === "on_hold").length;
  const planningCount = data.projects.filter(
    (p) => p.status === "planning" || p.status === "archived" || p.status === "suspended"
  ).length;
  const inProgressCount = data.projects.filter((p) => p.status === "in_progress").length;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PortalWelcomeBanner
        firstName={firstName}
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <PortalMetricCard
          label="Active Projects"
          value={data.kpis.activeProjects}
          icon={FolderKanban}
          trend={data.kpis.trends.activeProjects.text}
          trendTone={data.kpis.trends.activeProjects.tone}
        />
        <PortalMetricCard
          label="Virtual Tours"
          value={data.kpis.totalTours}
          icon={Camera}
          trend={data.kpis.trends.totalTours.text}
          trendTone={data.kpis.trends.totalTours.tone}
        />
        <PortalMetricCard
          label="Reports This Month"
          value={data.kpis.reportsThisMonth}
          icon={FileText}
          trend={data.kpis.trends.reportsThisMonth.text}
          trendTone={data.kpis.trends.reportsThisMonth.tone}
        />
        <PortalMetricCard
          label="Open Issues"
          value={data.kpis.openIssues}
          icon={AlertTriangle}
          trend={data.kpis.trends.openIssues.text}
          trendTone={data.kpis.trends.openIssues.tone}
        />
      </div>

      <ConstructionLatestTourCard tour={data.latestTour} />

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="dashboard-section-eyebrow">Projects</p>
            <h2 className="dashboard-section-title mt-0.5">All projects</h2>
            <p className="mt-1 text-xs text-slate-500">
              Progression % from each project&apos;s Progression Report when available
            </p>
          </div>
          <Button variant="ghost" size="sm" className="dashboard-ghost-link cursor-pointer" asChild>
            <Link href={`/dashboard/projects${q}`}>View all</Link>
          </Button>
        </div>
        <ConstructionProjectList
          projects={displayProjects}
          workspaceQuery={q}
          canUpdateStatus={canUpdateStatus}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <p className="dashboard-section-eyebrow">Portfolio summary</p>
          <h2 className="dashboard-section-title mt-0.5">Overall project information</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="intel-card p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Status breakdown</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <SummaryStat icon={FolderKanban} label="In progress" value={inProgressCount} />
              <SummaryStat icon={CheckCircle2} label="Completed" value={completedCount} />
              <SummaryStat icon={PauseCircle} label="On hold" value={onHoldCount} />
              <SummaryStat icon={CircleDashed} label="Planning / other" value={planningCount} />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Average progression:{" "}
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {data.overallProgressPercent}%
              </span>
            </p>
          </div>
          <div className="min-w-0">
            <PortalOverallProgressDonut
              overallPercent={data.overallProgressPercent}
              distribution={data.progressDistribution}
            />
          </div>
          <div className="min-w-0 md:col-span-2 xl:col-span-1">
            <PortalProgressTrendChart data={data.progressTrend} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FeedCard
            title="Recent Reports"
            icon={FileText}
            href={`/dashboard/reports${q}`}
            empty="No reports yet"
            isEmpty={data.stats.latestReports.length === 0}
          >
            {data.stats.latestReports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="dashboard-list-row flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {report.title}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(report.report_date)}</p>
                </div>
                <Badge className={getStatusColor(report.report_type)}>
                  {formatStatus(report.report_type)}
                </Badge>
              </div>
            ))}
          </FeedCard>

          <FeedCard
            title="Open Issues"
            icon={AlertTriangle}
            href={`/dashboard/issues${q}`}
            empty="No open issues"
            isEmpty={data.openIssuesList.length === 0}
          >
            {data.openIssuesList.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className="dashboard-list-row flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {issue.title}
                  </p>
                  <p className="text-xs text-slate-500">{issue.projectName}</p>
                </div>
                <Badge className={getStatusColor(issue.priority)}>
                  {formatStatus(issue.priority)}
                </Badge>
              </div>
            ))}
          </FeedCard>

          <FeedCard
            title="Latest Activity"
            icon={Activity}
            empty="No recent activity"
            isEmpty={data.stats.recentActivity.length === 0}
          >
            {data.stats.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-900 dark:bg-slate-200" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white">{activity.action}</p>
                  <p className="text-xs text-slate-500">
                    {activity.user?.full_name ?? "System"} ·{" "}
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </FeedCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FeedCard
            title="Upcoming Milestones"
            icon={Calendar}
            empty="No upcoming milestones"
            isEmpty={data.upcomingMilestones.length === 0}
          >
            {data.upcomingMilestones.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {event.title}
                  </p>
                  <p className="text-xs text-slate-500">{event.projectName}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(event.event_date)}</span>
              </div>
            ))}
          </FeedCard>

          <FeedCard
            title="Latest Documents"
            icon={FolderOpen}
            href={`/dashboard/documents${q}`}
            empty="No documents yet"
            isEmpty={data.latestDocuments.length === 0}
          >
            {data.latestDocuments.map((doc) => (
              <div
                key={doc.id}
                className="dashboard-list-row flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {doc.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {doc.projectName} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {formatStatus(doc.category)}
                </Badge>
              </div>
            ))}
          </FeedCard>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function FeedCard({
  title,
  icon: Icon,
  href,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  icon: typeof FileText;
  href?: string;
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="intel-card relative z-0 isolate p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="dashboard-section-title flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden />
          {title}
        </h3>
        {href ? (
          <Button variant="ghost" size="sm" className="cursor-pointer" asChild>
            <Link href={href}>View all</Link>
          </Button>
        ) : null}
      </div>
      {isEmpty ? (
        <p className="py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}
