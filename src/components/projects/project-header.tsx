"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Building2, Mail, Play, Camera, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus, getStatusColor } from "@/lib/utils";
import type { Project, Client, ProjectTour } from "@/lib/types";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/types";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

interface ProjectHeaderProps {
  project: Project;
  client?: Pick<Client, "id" | "name" | "company_name" | "email"> | null;
  backHref?: string;
  backLabel?: string;
  latestTour?: ProjectTour | null;
}

export function ProjectHeader({
  project,
  client,
  backHref = "/dashboard/projects",
  backLabel = "Back to Projects",
  latestTour = null,
}: ProjectHeaderProps) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolio = portal?.dashboardType === "portfolio";
  const cover = project.cover_image_url || latestTour?.thumbnail_url || null;
  const brand = client?.company_name || project.client_name;
  const category =
    project.portfolio_category != null
      ? PORTFOLIO_CATEGORY_LABELS[project.portfolio_category]
      : null;
  const sqft =
    project.area_sqft != null && project.area_sqft > 0
      ? `${project.area_sqft.toLocaleString("en-US")} sq ft`
      : null;

  if (isPortfolio) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-xs text-slate-500">
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </Button>

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
              <span className="rounded-full bg-brand-accent/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-950">
                {formatStatus(project.status)}
              </span>
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
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-brand-accent" />
                {project.location}
              </span>
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

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      <div className="intel-card rounded-xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-brand-primary dark:text-white">
                {project.name}
              </h1>
              <Badge className={getStatusColor(project.status)}>
                {formatStatus(project.status)}
              </Badge>
            </div>

            <div className="mb-3 flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Building2 className="h-4 w-4 shrink-0 text-brand-accent" />
              <span className="font-medium">{project.client_name}</span>
              {client?.company_name && (
                <span className="text-slate-500">· {client.company_name}</span>
              )}
            </div>

            {project.description && (
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-accent" />
              {project.location}
            </span>
            {project.start_date && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-accent" />
                {formatDate(project.start_date)}
                {project.completion_date && ` — ${formatDate(project.completion_date)}`}
              </span>
            )}
            {client?.email && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-accent" />
                {client.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
