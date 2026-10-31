"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  MapPin,
  Play,
  Ruler,
} from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DemoProject, PortfolioDashboardFixture } from "@/fixtures/types";
import { cn, getInitials } from "@/lib/utils";

function categoryLabel(category: DemoProject["portfolio_category"]) {
  if (!category) return null;
  return category.replace("_", " ");
}

function formatSqft(sqft: number | null) {
  if (sqft == null) return null;
  return `${sqft.toLocaleString("en-US")} sq ft`;
}

export function PortfolioShowcase({
  data,
  basePath,
}: {
  data: PortfolioDashboardFixture;
  basePath: "/interior" | "/real-estate";
}) {
  const [tourOpen, setTourOpen] = useState(false);
  const featured =
    data.projects.find((p) => p.id === data.featuredProjectId) ?? data.projects[0];
  const featuredTourUrl = featured?.latestTour?.matterport_url;
  const brand = data.clientName;

  return (
    <div className="dashboard-page portfolio-dashboard">
      <div className="intel-hero-strip flex items-center gap-4 sm:gap-5">
        <Avatar className="h-16 w-16 ring-2 ring-white shadow-soft sm:h-20 sm:w-20">
          <AvatarFallback className="bg-slate-900 text-lg font-semibold text-white sm:text-xl">
            {getInitials(data.fullName, data.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Portfolio
          </p>
          <h2 className="mt-1 truncate font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Welcome Back, {data.firstName}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-500">
            Browse curated walkthroughs and project highlights.
          </p>
        </div>
      </div>

      <section className="group relative min-h-[320px] overflow-hidden rounded-2xl bg-slate-950 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.5)] md:min-h-[400px]">
        {featured?.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={featured.cover_image_url}
            alt={featured.name}
            className="absolute inset-0 h-full w-full object-cover transition duration-1000 ease-out group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/55 to-black/15" />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30" />

        <div className="relative flex h-full min-h-[320px] flex-col justify-between p-5 md:min-h-[400px] md:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
              Featured project
            </p>
            {featuredTourUrl && (
              <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md sm:inline-flex">
                <Camera className="h-3 w-3 text-white/80" />
                360 ready
              </span>
            )}
          </div>

          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
              {featured?.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-white/75">
              <Building2 className="h-3.5 w-3.5" />
              {brand}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
              {featured?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {featured.location}
                </span>
              )}
              {formatSqft(featured?.area_sqft ?? null) && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {formatSqft(featured?.area_sqft ?? null)}
                </span>
              )}
              {categoryLabel(featured?.portfolio_category ?? null) && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                  {categoryLabel(featured?.portfolio_category ?? null)}
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="bg-white text-slate-950 hover:bg-white/90"
                asChild
              >
                <Link href={`${basePath}/projects/${featured.id}`}>
                  View project
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {featuredTourUrl && (
                <Button
                  variant="overlay"
                  onClick={() => setTourOpen(true)}
                >
                  <Play className="h-4 w-4" />
                  Launch walkthrough
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Projects completed", value: data.stats.completed },
          { label: "Cities covered", value: data.stats.locations },
          { label: "Virtual walkthroughs", value: data.stats.walkthroughs },
        ].map((stat) => (
          <div key={stat.label} className="intel-card p-4 text-center sm:text-left">
            <p className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3">
          <p className="dashboard-section-eyebrow">Collection</p>
          <h2 className="dashboard-section-title mt-0.5">Project portfolio</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((project) => {
            const cover = project.cover_image_url || project.latestTour?.thumbnail_url;
            return (
              <Link
                key={project.id}
                href={`${basePath}/projects/${project.id}`}
                className="group relative block overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-black/5 transition duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.4)]"
              >
                <div className="relative aspect-4/5 overflow-hidden sm:aspect-4/3">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={project.name}
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute left-3 top-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white",
                        project.status === "completed"
                          ? "bg-slate-800/95"
                          : "bg-black/50 backdrop-blur-sm"
                      )}
                    >
                      {project.status === "completed" ? "Completed" : "In progress"}
                    </span>
                  </div>
                  {project.tourCount > 0 && (
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-900 shadow-lg">
                      360
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-base font-semibold tracking-tight text-white">
                      {project.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/65">
                      {project.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </span>
                      )}
                      {formatSqft(project.area_sqft) && (
                        <span>{formatSqft(project.area_sqft)}</span>
                      )}
                    </div>
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
          })}
        </div>
      </section>

      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>{featured?.name} walkthrough</DialogTitle>
          </DialogHeader>
          <div className="p-3 sm:p-4">
            {featuredTourUrl && (
              <MatterportViewer url={featuredTourUrl} title={featured?.name} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
