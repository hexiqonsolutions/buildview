"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Camera } from "lucide-react";
import { useIntelProjectContext } from "@/components/intel/shell/intel-project-context";
import { usePortalWorkspaceHref } from "@/components/portal/workspace/use-portal-workspace-href";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import { formatDate } from "@/lib/utils";

/** Shows project context when user is inside a project route. */
export function IntelContextBar() {
  const pathname = usePathname();
  const { project } = useIntelProjectContext();
  const projectsHref = usePortalWorkspaceHref("/dashboard/projects");
  const { dashboardType } = usePortalWorkspace();
  const isPortfolio = dashboardType === "portfolio";
  const onProjectRoute = /^\/dashboard\/projects\/[^/]+/.test(pathname ?? "");

  if (!onProjectRoute || !project) return null;

  return (
    <div className="intel-context-bar">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs text-slate-600 lg:px-8 dark:text-slate-400">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-accent-dark" />
        <Link href={projectsHref} className="font-medium text-slate-500 hover:text-slate-700">
          {isPortfolio ? "Projects" : "Projects"}
        </Link>
        <span className="text-slate-300">›</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200">{project.projectName}</span>
        {!isPortfolio && (
          <>
            <span className="text-slate-300">·</span>
            <span>{project.progress}% complete</span>
          </>
        )}
        {project.latestScanDate && (
          <>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {isPortfolio ? "Walkthrough" : "Latest scan"} {formatDate(project.latestScanDate)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
