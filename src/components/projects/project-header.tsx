"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  Mail,
  Play,
  Camera,
  Ruler,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpdateProjectStatusSelect } from "@/components/shared/update-project-status-select";
import {
  formatDate,
  formatStatus,
  getProjectProgressPercent,
  getStatusColor,
} from "@/lib/utils";
import type { Project, Client, ProjectTour } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/types";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { cn } from "@/lib/utils";

interface ProjectHeaderProps {
  project: Project;
  client?: Pick<Client, "id" | "name" | "company_name" | "email"> | null;
  backHref?: string;
  backLabel?: string;
  latestTour?: ProjectTour | null;
  canUpdateStatus?: boolean;
  allowStaffStatuses?: boolean;
  /** Optional actions (e.g. Upload) rendered in the header card */
  actions?: ReactNode;
}

function titleCaseLocation(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProjectHeader({
  project,
  client,
  backHref = "/dashboard/projects",
  backLabel = "Back to Projects",
  latestTour = null,
  canUpdateStatus = false,
  allowStaffStatuses = false,
  actions,
}: ProjectHeaderProps) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolio = portal?.dashboardType === "portfolio";
  const cover = project.cover_image_url || latestTour?.thumbnail_url || null;
  const brand = client?.company_name || project.client_name;
  const clientLabel = (() => {
    const company = client?.company_name?.trim();
    const name = project.client_name?.trim();
    if (company && name && company.toLowerCase() !== name.toLowerCase()) {
      return `${name} · ${company}`;
    }
    return company || name || null;
  })();
  const category =
    project.portfolio_category != null
      ? PORTFOLIO_CATEGORY_LABELS[project.portfolio_category]
      : null;
  const sqft =
    project.area_sqft != null && project.area_sqft > 0
      ? `${project.area_sqft.toLocaleString("en-US")} sq ft`
      : null;
  const progress = getProjectProgressPercent(project.status);
  const location = titleCaseLocation(project.location);
  const schedule =
    project.start_date != null
      ? `${formatDate(project.start_date)}${
          project.completion_date ? ` — ${formatDate(project.completion_date)}` : ""
        }`
      : null;

  if (isPortfolio) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-xs text-slate-500">
            <Link href={backHref}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </Button>
          {actions}
        </div>

        <section className="relative min-h-[220px] overflow-hidden rounded-2xl bg-slate-950 shadow-lg md:min-h-[280px]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={project.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-900 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="relative flex min-h-[220px] flex-col justify-end p-5 md:min-h-[280px] md:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {canUpdateStatus ? (
                <UpdateProjectStatusSelect
                  projectId={project.id}
                  currentStatus={project.status}
                  allowStaffStatuses={allowStaffStatuses}
                  triggerClassName="h-7 w-[7.75rem] border-white/20 bg-white/95 text-[11px] shadow-sm"
                />
              ) : (
                <span className="rounded-full bg-brand-accent/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950">
                  {formatStatus(project.status)}
                </span>
              )}
              {category && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {category}
                </span>
              )}
              {latestTour && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  <Camera className="h-2.5 w-2.5" />
                  360 Walkthrough
                </span>
              )}
            </div>
            <h1 className="max-w-2xl font-display text-xl font-bold tracking-tight text-white md:text-2xl">
              {project.name}
            </h1>
            <p className="mt-1 text-xs font-medium text-white/75">{brand}</p>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-white/70">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-brand-accent" />
                  {location}
                </span>
              )}
              {sqft && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-brand-accent" />
                  {sqft}
                </span>
              )}
              {project.completion_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-brand-accent" />
                  {formatDate(project.completion_date)}
                </span>
              )}
            </div>

            {project.description && (
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/60">
                {project.description}
              </p>
            )}

            {latestTour?.matterport_url && (
              <div className="mt-4">
                <Button
                  size="sm"
                  className="h-9 bg-brand-accent text-xs font-semibold text-slate-950 hover:bg-brand-accent-dark"
                  asChild
                >
                  <a href="#project-walkthrough">
                    <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                    Open Virtual Walkthrough
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  const metaItems = [
    location
      ? { key: "location", label: "Location", value: location, icon: MapPin, tone: "brand" as const }
      : null,
    schedule
      ? { key: "schedule", label: "Schedule", value: schedule, icon: Calendar, tone: "sky" as const }
      : null,
    client?.email
      ? {
          key: "email",
          label: "Contact",
          value: client.email,
          icon: Mail,
          tone: "slate" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    icon: typeof MapPin;
    tone: "brand" | "sky" | "slate";
  }>;

  const toneStyles = {
    brand: "bg-brand-accent/12 text-brand-accent ring-brand-accent/15",
    sky: "bg-sky-500/12 text-sky-600 ring-sky-500/15 dark:text-sky-400",
    slate: "bg-slate-500/12 text-slate-600 ring-slate-500/15 dark:text-slate-300",
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2 text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
      >
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      <section
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.14)]",
          "dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none",
          "motion-safe:animate-[fadeInUp_0.4s_ease-out_both]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-accent/[0.07] via-transparent to-sky-500/[0.04]"
          aria-hidden
        />
        <div
          className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-brand-accent to-brand-accent/30"
          aria-hidden
        />

        <div className="relative p-5 pl-6 sm:p-6 sm:pl-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Project workspace
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      {project.name}
                    </h1>
                    {canUpdateStatus ? (
                      <UpdateProjectStatusSelect
                        projectId={project.id}
                        currentStatus={project.status}
                        allowStaffStatuses={allowStaffStatuses}
                      />
                    ) : (
                      <Badge className={cn("capitalize", getStatusColor(project.status))}>
                        {formatStatus(project.status)}
                      </Badge>
                    )}
                  </div>
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
              </div>

              {clientLabel && (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate font-medium">{clientLabel}</span>
                </div>
              )}

              {project.description && (
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {project.description}
                </p>
              )}

              {/* Progress */}
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-500">Overall progress</span>
                  <span className="font-display font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            </div>

            {metaItems.length > 0 && (
              <div className="grid w-full shrink-0 gap-2 sm:grid-cols-3 lg:w-[22rem] lg:grid-cols-1">
                {metaItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 transition-colors duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                        toneStyles[item.tone]
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {item.key === "email" ? (
                          <a
                            href={`mailto:${item.value}`}
                            className="transition-colors hover:text-brand-accent"
                          >
                            {item.value}
                          </a>
                        ) : (
                          item.value
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
