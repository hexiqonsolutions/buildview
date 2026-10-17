"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpdateProjectStatusSelect } from "@/components/shared/update-project-status-select";
import { formatStatus, getStatusColor, cn } from "@/lib/utils";
import type { ProjectWithMeta } from "@/lib/data/projects";

export function ConstructionProjectList({
  projects,
  workspaceQuery = "",
  canUpdateStatus = false,
}: {
  projects: ProjectWithMeta[];
  workspaceQuery?: string;
  canUpdateStatus?: boolean;
}) {
  if (projects.length === 0) {
    return (
      <div className="intel-card p-8 text-center">
        <p className="text-sm text-slate-500">No projects assigned yet.</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/dashboard/projects${workspaceQuery}`}>Browse projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="intel-card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
      {projects.map((project) => {
        const href = `/dashboard/projects/${project.id}${workspaceQuery}`;
        const progress = Math.min(100, Math.max(0, project.progress ?? 0));

        return (
          <li key={project.id}>
            <div className="group flex flex-col gap-3 px-4 py-4 transition-colors duration-150 hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4 sm:px-5 dark:hover:bg-slate-900/40">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={href}
                    className="truncate font-display text-sm font-semibold tracking-tight text-slate-900 hover:underline dark:text-white"
                  >
                    {project.name}
                  </Link>
                  {canUpdateStatus ? (
                    <UpdateProjectStatusSelect
                      projectId={project.id}
                      currentStatus={project.status}
                      triggerClassName="h-7 w-auto min-w-28 text-[11px]"
                    />
                  ) : (
                    <Badge className={cn("capitalize", getStatusColor(project.status))}>
                      {formatStatus(project.status)}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{project.location || "Location TBD"}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{project.stage}</span>
                  {(project.tourCount ?? 0) > 0 ? (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>
                        {project.tourCount} walkthrough
                        {(project.tourCount ?? 0) === 1 ? "" : "s"}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="w-full shrink-0 sm:w-44 lg:w-52">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {progress}%
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${project.name} progression ${progress} percent`}
                >
                  <div
                    className="h-full rounded-full bg-slate-800 transition-[width] duration-500 ease-out dark:bg-slate-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 self-start text-slate-600 sm:self-center dark:text-slate-300"
                asChild
              >
                <Link href={href}>
                  Open
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
