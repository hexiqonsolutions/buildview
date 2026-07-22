"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FolderKanban, Sparkles } from "lucide-react";
import { PortalProjectCard } from "@/components/portal/portal-project-card";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { Input } from "@/components/ui/input";
import { scopeToPortalQueryString } from "@/lib/admin/scope";
import type { ProjectWithMeta } from "@/lib/actions/data";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

export function ClientProjectsGallery({ projects }: { projects: ProjectWithMeta[] }) {
  const [query, setQuery] = useState("");
  const { hydrated, scope, dashboardType } = usePortalWorkspace();
  const workspaceQuery = hydrated ? scopeToPortalQueryString(scope) : "";
  const isPortfolio = dashboardType === "portfolio";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const active = filtered.filter((p) => p.status !== "completed");
  const completed = filtered.filter((p) => p.status === "completed");

  const showcaseProjects = isPortfolio
    ? [...filtered].sort((a, b) => {
        const aDate = a.latestScanDate ?? a.created_at;
        const bDate = b.latestScanDate ?? b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })
    : filtered;

  return (
    <IntelPage
      title={isPortfolio ? "Project Portfolio" : "Your Projects"}
      description={
        isPortfolio
          ? "Browse curated work with immersive Matterport walkthroughs — ideal for architecture, interior design, and real estate showcases."
          : "Executive view of every construction project — progress, latest scans, and quick access to Matterport tours."
      }
      icon={isPortfolio ? Sparkles : FolderKanban}
      eyebrow={isPortfolio ? "Showcase" : "Portfolio"}
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Projects" />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={isPortfolio ? "Search portfolio…" : "Search projects…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="intel-card p-12 text-center">
            <p className="text-sm text-slate-500">
              {projects.length === 0
                ? isPortfolio
                  ? "No projects in this showcase yet. Your BuildView team will add work here."
                  : "No projects in this workspace. Clear building/floor filters or select another project."
                : "No projects match your search."}
            </p>
          </div>
        ) : isPortfolio ? (
          <section className="space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              All projects ({showcaseProjects.length})
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {showcaseProjects.map((project) => (
                <PortalProjectCard
                  key={project.id}
                  project={project}
                  workspaceQuery={workspaceQuery}
                />
              ))}
            </div>
          </section>
        ) : (
          <>
            {active.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Active ({active.length})
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {active.map((project) => (
                    <PortalProjectCard
                      key={project.id}
                      project={project}
                      workspaceQuery={workspaceQuery}
                    />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Completed ({completed.length})
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {completed.map((project) => (
                    <PortalProjectCard
                      key={project.id}
                      project={project}
                      workspaceQuery={workspaceQuery}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-400">
          Need admin access?{" "}
          <Link href="/admin" className="text-slate-600 underline dark:text-slate-300">
            Open operations center
          </Link>
        </p>
      </div>
    </IntelPage>
  );
}
