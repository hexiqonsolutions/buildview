import Link from "next/link";
import { PortalWelcomeBanner, PortalQuickActions } from "@/components/portal/portal-dashboard";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import { PortalProjectCard } from "@/components/portal/portal-project-card";
import {
  PortalOverallProgressDonut,
  PortalProgressTrendChart,
} from "@/components/portal/portal-charts";
import { PortalLatestTourCard } from "@/components/intel/dashboard/portal-latest-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime, formatStatus, getStatusColor } from "@/lib/utils";
import type { ClientDashboardData } from "@/lib/actions/data";
import {
  AlertTriangle,
  FileText,
  FolderOpen,
  Calendar,
  FolderKanban,
  Camera,
  Activity,
} from "lucide-react";

interface ExecutiveOverviewProps {
  firstName: string;
  data: ClientDashboardData;
  workspaceQuery?: string;
}

export function ExecutiveOverview({
  firstName,
  data,
  workspaceQuery = "",
}: ExecutiveOverviewProps) {
  const displayProjects = data.projects.filter((p) => p.status !== "completed").slice(0, 3);
  const q = workspaceQuery || "";

  return (
    <div className="dashboard-page">
      <PortalWelcomeBanner firstName={firstName} />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <PortalMetricCard
          label="Active Projects"
          value={data.kpis.activeProjects}
          icon={FolderKanban}
          trend={data.kpis.trends.activeProjects.text}
          trendTone={data.kpis.trends.activeProjects.tone}
        />
        <PortalMetricCard
          label="Matterport Tours"
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

      <PortalLatestTourCard tour={data.latestTour} />

      <PortalQuickActions workspaceQuery={workspaceQuery} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="dashboard-section-eyebrow">Projects</p>
              <h2 className="dashboard-section-title mt-0.5">Your Projects</h2>
            </div>
            <Button variant="ghost" size="sm" className="dashboard-ghost-link" asChild>
              <Link href={`/dashboard/projects${q}`}>View all</Link>
            </Button>
          </div>
          {displayProjects.length === 0 ? (
            <div className="intel-card p-8 text-center">
              <p className="text-sm text-slate-500">No active projects assigned yet.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href={`/dashboard/projects${q}`}>Browse projects</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
              {displayProjects.map((project) => (
                <PortalProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <PortalOverallProgressDonut
            overallPercent={data.overallProgressPercent}
            distribution={data.progressDistribution}
          />
          <PortalProgressTrendChart data={data.progressTrend} />
        </div>
      </div>

      <FeedWidgets data={data} workspaceQuery={workspaceQuery} />
    </div>
  );
}

function FeedWidgets({
  data,
  workspaceQuery = "",
}: {
  data: ClientDashboardData;
  workspaceQuery?: string;
}) {
  const q = workspaceQuery || "";
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="intel-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dashboard-section-title flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Recent Reports
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/reports${q}`}>View all</Link>
            </Button>
          </div>
          {data.stats.latestReports.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No reports yet</p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </section>

        <section className="intel-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dashboard-section-title flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              Open Issues
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/issues${q}`}>View all</Link>
            </Button>
          </div>
          {data.openIssuesList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No open issues</p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </section>

        <section className="intel-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h3 className="dashboard-section-title">
              Latest Activity
            </h3>
          </div>
          {data.stats.recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.stats.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">{activity.action}</p>
                    <p className="text-xs text-slate-500">
                      {activity.user?.full_name ?? "System"} ·{" "}
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="intel-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <h3 className="dashboard-section-title">
              Upcoming Milestones
            </h3>
          </div>
          {data.upcomingMilestones.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No upcoming milestones</p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </section>

        <section className="intel-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="dashboard-section-title flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-400" />
              Latest Documents
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/documents${q}`}>View all</Link>
            </Button>
          </div>
          {data.latestDocuments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No documents yet</p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </section>
      </div>
    </>
  );
}
