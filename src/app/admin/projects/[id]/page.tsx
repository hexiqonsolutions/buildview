import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProjectWithClient,
  getProjectDetail,
  getProjectInvoices,
} from "@/lib/actions/data";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { ProjectWorkspaceTabs } from "@/components/admin/projects/project-workspace-tabs";
import { ProjectMatterportUploader } from "@/components/projects/project-matterport-uploader";
import { ClientWorkspaceSync } from "@/components/admin/workspace/client-workspace-sync";
import { OpsWorkspaceBanner } from "@/components/admin/ops/ops-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projectData, detail, invoices, spatialHierarchy] = await Promise.all([
    getProjectWithClient(id),
    getProjectDetail(id),
    getProjectInvoices(id),
    getProjectSpatialHierarchy(id),
  ]);

  if (!projectData) notFound();

  const { project, client } = projectData;

  return (
    <div className="animate-fade-in space-y-6">
      <ClientWorkspaceSync clientId={client?.id} projectId={project.id} />

      <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-500">
        <Link href="/admin/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Project Manager
        </Link>
      </Button>

      <OpsWorkspaceBanner />

      <div className="ops-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <Building2 className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Project Workspace
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {client?.company_name || client?.name} · {project.location || "No location"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="capitalize">{project.status.replace(/_/g, " ")}</Badge>
                {project.start_date && (
                  <Badge variant="outline">Started {formatDate(project.start_date)}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {client && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/clients/${client.id}`}>Client workspace</Link>
              </Button>
            )}
            <ProjectMatterportUploader
              projectId={project.id}
              variant="default"
              triggerClassName="ops-btn-primary h-9"
            />
            <Button asChild size="sm" variant="outline" className="h-9">
              <Link href={`/admin/upload?project=${project.id}`}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <ProjectWorkspaceTabs
        projectId={project.id}
        spatialHierarchy={spatialHierarchy}
        tours={detail.tours}
        reports={detail.reports}
        folders={detail.folders}
        documents={detail.documents}
        issues={detail.issues}
        timeline={detail.timeline}
        invoices={invoices}
        canUploadMatterport
      />
    </div>
  );
}
