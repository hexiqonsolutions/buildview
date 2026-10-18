import { notFound } from "next/navigation";
import Link from "next/link";
import { getClients } from "@/lib/data/clients";
import { getProjectInvoices } from "@/lib/data/invoices";
import { getProjectDetail, getProjectTeam, getProjectWithClient } from "@/lib/data/projects";
import { getProjectProgression } from "@/lib/data/progression";
import { EditProjectDetailsDialog } from "@/components/admin/edit-project-details-dialog";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { getProjectMediaAdmin } from "@/lib/actions/project-media";
import { ProjectMediaManager } from "@/components/admin/projects/project-media-manager";
import { getCurrentUser } from "@/lib/actions/auth";
import { canCommentOnProject, canUploadMatterport, canViewProgression } from "@/lib/auth/permissions";
import { ProjectWorkspaceTabs } from "@/components/admin/projects/project-workspace-tabs";
import { ProjectMatterportUploader } from "@/components/projects/project-matterport-uploader";
import { ClientWorkspaceSync } from "@/components/admin/workspace/client-workspace-sync";
import { OpsWorkspaceBanner } from "@/components/admin/ops/ops-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Pencil, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const floorParam = query.floor;
  const floorId = typeof floorParam === "string" ? floorParam : null;

  const projectData = await getProjectWithClient(id);
  if (!projectData) notFound();

  const { project, client } = projectData;
  const isPortfolioClient = client?.dashboard_type === "portfolio";

  const [
    detail,
    invoices,
    spatialHierarchy,
    currentUser,
    team,
    projectMedia,
    clients,
    progression,
  ] = await Promise.all([
    getProjectDetail(id),
    getProjectInvoices(id),
    getProjectSpatialHierarchy(id),
    getCurrentUser(),
    getProjectTeam(id).catch(() => []),
    getProjectMediaAdmin(id).catch(() => null),
    getClients().catch(() => []),
    isPortfolioClient
      ? Promise.resolve(null)
      : getProjectProgression(id, floorId).catch(() => null),
  ]);

  const allowMatterportUpload = currentUser ? canUploadMatterport(currentUser.role) : false;
  const allowProgression =
    !isPortfolioClient && currentUser ? canViewProgression(currentUser.role) : false;
  const showComments =
    !isPortfolioClient && currentUser ? canCommentOnProject(currentUser.role) : false;

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
            <EditProjectDetailsDialog
              project={project}
              clients={clients}
              trigger={
                <Button variant="outline" size="sm" className="h-9">
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit Project
                </Button>
              }
            />
            {client && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/clients/${client.id}`}>Client workspace</Link>
              </Button>
            )}
            {allowMatterportUpload && (
              <ProjectMatterportUploader
                projectId={project.id}
                variant="default"
                triggerClassName="ops-btn-primary h-9"
              />
            )}
            <Button asChild size="sm" variant="outline" className="h-9">
              <Link href={`/admin/upload?project=${project.id}`}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {projectMedia?.isPortfolio && (
        <ProjectMediaManager projectId={project.id} initialMedia={projectMedia.media} />
      )}

      <ProjectWorkspaceTabs
        projectId={project.id}
        projectName={project.name}
        spatialHierarchy={spatialHierarchy}
        tours={detail.tours}
        reports={detail.reports}
        folders={detail.folders}
        documents={detail.documents}
        issues={detail.issues}
        timeline={detail.timeline}
        invoices={invoices}
        team={team}
        canUploadMatterport={allowMatterportUpload}
        allowInvoices
        progression={progression}
        allowProgression={allowProgression}
        comments={detail.comments}
        currentUserId={currentUser?.id}
        showComments={showComments}
      />
    </div>
  );
}
