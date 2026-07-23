"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Camera, MapPin, Play, Ruler } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import type { PortfolioDashboardData, PortfolioProjectItem } from "@/lib/portal/portfolio-data";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioCategory,
} from "@/lib/types";

function projectCover(project: PortfolioProjectItem): string | null {
  return project.cover_image_url || project.latestTour?.thumbnail_url || null;
}

function formatMonthYear(date: string | null | undefined): string | null {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function formatSqft(sqft: number | null | undefined): string | null {
  if (sqft == null || !Number.isFinite(sqft) || sqft <= 0) return null;
  return `${sqft.toLocaleString("en-US")} sq ft`;
}

function categoryLabel(
  category: PortfolioCategory | null | undefined
): string | null {
  if (!category) return null;
  return PORTFOLIO_CATEGORY_LABELS[category] ?? null;
}

function ProjectMetaRow({
  project,
  className,
}: {
  project: PortfolioProjectItem;
  className?: string;
}) {
  const category = categoryLabel(project.portfolio_category);
  const sqft = formatSqft(project.area_sqft);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/65",
        className
      )}
    >
      {project.location && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0 text-brand-accent" />
          {project.location}
        </span>
      )}
      {sqft && (
        <span className="inline-flex items-center gap-1">
          <Ruler className="h-3 w-3 shrink-0 text-brand-accent" />
          {sqft}
        </span>
      )}
      {category && (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
          {category}
        </span>
      )}
    </div>
  );
}

function PortfolioGridCard({
  project,
  workspaceQuery,
}: {
  project: PortfolioProjectItem;
  workspaceQuery: string;
}) {
  const href = `/dashboard/projects/${project.id}${workspaceQuery}`;
  const cover = projectCover(project);
  const hasTour = Boolean(project.latestTour?.matterport_url);

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-black/5 transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.4)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={project.name}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-slate-600 via-slate-900 to-black p-5">
            <span className="font-display text-4xl font-bold text-white/10">
              {project.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute left-3 top-3">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white",
              project.status === "completed" ? "bg-emerald-600/95" : "bg-black/50 backdrop-blur-sm"
            )}
          >
            {project.status === "completed" ? "Completed" : "In progress"}
          </span>
        </div>
        {hasTour && (
          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent text-[9px] font-bold text-slate-950 shadow-lg">
            360
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-base font-semibold tracking-tight text-white">
            {project.name}
          </h3>
          <ProjectMetaRow project={project} className="mt-1.5" />
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
              {project.tourCount > 0
                ? `${project.tourCount} walkthrough${project.tourCount === 1 ? "" : "s"}`
                : "Showcase"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 opacity-0 transition group-hover:opacity-100">
              View
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PortfolioShowcaseShell({ data }: { data: PortfolioDashboardData }) {
  const { hydrated, scope, clientName } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";
  const [tourOpen, setTourOpen] = useState(false);

  const featured = data.featuredProject;
  const featuredHref = featured
    ? `/dashboard/projects/${featured.id}${workspaceQuery}`
    : `/dashboard/projects${workspaceQuery}`;
  const featuredCover = featured ? projectCover(featured) : null;
  const featuredTourUrl =
    featured?.latestTour?.matterport_url ?? data.featuredTour?.matterport_url;
  const gridProjects = data.projects;
  const brand = data.clientName ?? clientName ?? "Studio";

  const stats = [
    { label: "Projects completed", value: data.stats.completed },
    { label: "Cities covered", value: data.stats.locations },
    { label: "Virtual walkthroughs", value: data.stats.walkthroughs },
    {
      label: "Active projects",
      value: Math.max(0, data.stats.projects - data.stats.completed),
    },
  ];

  return (
    <div className="dashboard-page portfolio-dashboard">
      <section
        id="featured"
        className="group relative min-h-[320px] overflow-hidden rounded-2xl bg-slate-950 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.5)] md:min-h-[400px]"
      >
        {featuredCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={featuredCover}
            alt={featured?.name ?? "Featured project"}
            className="absolute inset-0 h-full w-full object-cover transition duration-1000 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-600 via-slate-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        <div className="relative flex h-full min-h-[320px] flex-col justify-between p-5 md:min-h-[400px] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-accent">
              Featured project
            </p>
            {featuredTourUrl && (
              <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md sm:inline-flex">
                <Camera className="h-3 w-3 text-brand-accent" />
                360 ready
              </span>
            )}
          </div>

          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl md:leading-tight">
              {featured?.name ?? "Your next showcase project"}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/75">
              <Building2 className="h-3.5 w-3.5 text-brand-accent" />
              {brand}
            </p>

            {featured && (
              <ProjectMetaRow project={featured} className="mt-3 text-xs text-white/65" />
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/55">
              {featured?.completion_date && (
                <span>{formatMonthYear(featured.completion_date)}</span>
              )}
              {featured && featured.tourCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Camera className="h-3 w-3 text-brand-accent" />
                  {featured.tourCount} walkthrough{featured.tourCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {featuredTourUrl ? (
                <Button
                  size="sm"
                  className="h-9 rounded-full bg-brand-accent px-5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-accent/25 hover:bg-brand-accent-dark"
                  onClick={() => setTourOpen(true)}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                  Open Virtual Walkthrough
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-9 rounded-full bg-brand-accent px-5 text-xs font-semibold text-slate-950 shadow-lg shadow-brand-accent/25 hover:bg-brand-accent-dark"
                  asChild
                >
                  <Link href={featuredHref}>
                    <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />
                    View Project
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-full border-white/25 bg-white/5 px-4 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
                asChild
              >
                <Link href={featuredHref}>
                  Project Details
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            {data.clientLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.clientLogoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-contain ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 font-display text-sm font-bold text-brand-accent">
                {brand.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Your portfolio
              </p>
              <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {brand}
              </h2>
            </div>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-500 md:text-right">
            {data.tagline}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-100 dark:lg:divide-slate-800">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="px-5 py-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50 md:px-6"
            >
              <p className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Selected work
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white md:text-xl">
              All projects
            </h2>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600" asChild>
            <Link href={`/dashboard/projects${workspaceQuery}`}>
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {gridProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Camera className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
              No projects yet
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
              Once projects and Matterport links are added, your portfolio will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {gridProjects.map((project) => (
              <PortfolioGridCard
                key={project.id}
                project={project}
                workspaceQuery={workspaceQuery}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="max-w-5xl overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <DialogTitle className="font-display text-base">
              {featured?.latestTour?.name ?? featured?.name ?? "Virtual walkthrough"}
            </DialogTitle>
          </DialogHeader>
          {featuredTourUrl && (
            <MatterportViewer
              url={featuredTourUrl}
              title={featured?.name ?? "Walkthrough"}
              aspectRatio
              showToolbar
              className="rounded-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
