import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  FolderKanban,
  MapPin,
} from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConstructionDashboardFixture } from "@/fixtures/types";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";

export function ConstructionOverview({ data }: { data: ConstructionDashboardFixture }) {
  const project = data.projects[0];
  const metrics = [
    { label: "Active Projects", value: data.kpis.activeProjects, icon: FolderKanban, hint: "Completed showcase" },
    { label: "Virtual Tours", value: data.kpis.totalTours, icon: Camera, hint: "Dated scan library" },
    { label: "Reports This Month", value: data.kpis.reportsThisMonth, icon: FileText, hint: "Warranty pack" },
    { label: "Open Issues", value: data.kpis.openIssues, icon: AlertTriangle, hint: "All closed historically" },
  ];

  return (
    <div className="dashboard-page">
      <div className="intel-hero-strip flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="dashboard-section-eyebrow">Construction Intelligence</p>
          <h1 className="dashboard-section-title mt-1">Welcome Back, {data.firstName}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Completed multi-year monitoring twin for {data.clientName} — scans, progression,
            issues, timeline, and team conversation from 2023–2026.
          </p>
        </div>
        <Badge className="w-fit bg-slate-200 text-slate-800 hover:bg-slate-200">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Project completed
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="intel-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="dashboard-metric-label">{m.label}</p>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
                {m.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{m.hint}</p>
            </div>
          );
        })}
      </div>

      {data.latestTour && (
        <section className="intel-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <p className="dashboard-section-eyebrow">Latest walkthrough</p>
              <h2 className="mt-0.5 text-base font-semibold text-slate-900">{data.latestTour.name}</h2>
              <p className="text-xs text-slate-500">
                Captured {formatDate(data.latestTour.capture_date)} · {data.latestTour.building} /{" "}
                {data.latestTour.floor}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/construction/projects/${project.id}?tab=scans`}>Open scans</Link>
            </Button>
          </div>
          <div className="p-3 sm:p-4">
            <MatterportViewer
              url={data.latestTour.matterport_url}
              title={data.latestTour.name}
            />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <p className="dashboard-section-eyebrow">Projects</p>
          <h2 className="dashboard-section-title mt-0.5">All projects</h2>
        </div>
        <Link
          href={`/construction/projects/${project.id}`}
          className="intel-card dashboard-card-hover block p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-slate-900">{project.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(project.status)}`}>
                  {formatStatus(project.status)}
                </span>
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {project.location}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>Progression</span>
                  <span className="font-semibold text-slate-800">{project.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-accent" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {project.tourCount} scans · {project.issues.length} issues · timeline 2023–2026
              </p>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
