"use client";

import { ProjectToursSection } from "@/components/projects/project-tours-section";
import { ProjectMatterportUploader } from "@/components/projects/project-matterport-uploader";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { ProjectTour } from "@/lib/types";
import { Camera } from "lucide-react";

/**
 * Matterport lives on the project itself (overview) — not a separate Matterport tab.
 * Admin can paste embed URLs here; clients see the walkthrough showcase.
 */
export function ProjectMatterportPanel({
  projectId,
  tours,
  canUpload = false,
}: {
  projectId: string;
  tours: ProjectTour[];
  canUpload?: boolean;
}) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolio = portal?.dashboardType === "portfolio";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white md:text-xl">
            {isPortfolio ? "Virtual walkthrough" : "Matterport walkthrough"}
          </h2>
          <p className="text-sm text-slate-500">
            {canUpload
              ? "Paste a Matterport share link to embed it on this project for clients."
              : isPortfolio
                ? "Step inside this space with an immersive 360° Matterport tour."
                : "Explore the immersive 3D tour for this project."}
          </p>
        </div>
        {canUpload && <ProjectMatterportUploader projectId={projectId} />}
      </div>

      {tours.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 dark:border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700/40 via-slate-950 to-black" />
          <div className="relative flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent/20 text-brand-accent">
              <Camera className="h-7 w-7" />
            </span>
            <p className="font-display text-lg font-semibold text-white">
              {canUpload ? "Add your first walkthrough" : "Walkthrough coming soon"}
            </p>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {canUpload
                ? "Paste a my.matterport.com share link to embed the 360° tour on this project."
                : "Your BuildView team will publish a Matterport tour for this project shortly."}
            </p>
            {canUpload && (
              <div className="mt-6">
                <ProjectMatterportUploader
                  projectId={projectId}
                  variant="default"
                  triggerClassName="ops-btn-primary h-10 px-5"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ProjectToursSection tours={tours} projectId={projectId} />
          {canUpload && (
            <div className="flex justify-end">
              <ProjectMatterportUploader projectId={projectId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
