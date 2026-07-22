"use client";

import { MapPin } from "lucide-react";
import { usePortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";

export function PortalWorkspaceContextStrip({
  noun = "View",
}: {
  noun?: string;
}) {
  const { hydrated, scope, project, clientName } = usePortalWorkspace();

  if (!hydrated || !scope.projectId) {
    return null;
  }

  const projectLabel = project?.name?.trim() || "Project";
  const companyLabel =
    clientName?.trim() ||
    project?.client_name?.trim() ||
    null;

  const detailParts: string[] = [];
  if (scope.building !== "all") detailParts.push(scope.building);
  if (scope.floor !== "all") detailParts.push(scope.floor);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <MapPin className="h-4 w-4 shrink-0 text-brand-accent-dark" />
      <div className="min-w-0 text-sm leading-snug">
        <p className="text-slate-500 dark:text-slate-400">
          {noun} scoped to
        </p>
        <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
          {companyLabel ? (
            <>
              <span className="text-slate-900 dark:text-white">{companyLabel}</span>
              <span className="mx-1.5 font-normal text-slate-400">·</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {projectLabel}
              </span>
            </>
          ) : (
            projectLabel
          )}
          {detailParts.length > 0 && (
            <>
              <span className="mx-1.5 font-normal text-slate-400">·</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {detailParts.join(" · ")}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
