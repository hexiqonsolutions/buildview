import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectWithClient, getProjectDetail, getProjectInvoices, getProjectTeam } from "@/lib/actions/data";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectHubTabs } from "@/components/intel/projects/project-hub-tabs";
import { IntelProjectContextBridge } from "@/components/intel/shell/intel-project-context";
import { getCurrentUser } from "@/lib/actions/auth";
import {
  can,
  canManageClientUploads,
  canCommentOnProject,
  canUploadMatterport,
  canCreateProjectIssue,
  canUpdateIssueStatus,
} from "@/lib/auth/permissions";
import { getProjectProgressPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { ProjectCommentsSection } from "@/components/projects/project-comments-section";

const EMPTY_DETAIL = {
  tours: [],
  reports: [],
  folders: [],
  documents: [],
  issues: [],
  timeline: [],
  comments: [],
} as Awaited<ReturnType<typeof getProjectDetail>>;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projectData, detail, invoices, user, spatialHierarchy, team] = await Promise.all([
    getProjectWithClient(id).catch(() => null),
    getProjectDetail(id).catch(() => EMPTY_DETAIL),
    getProjectInvoices(id).catch(() => []),
    getCurrentUser().catch(() => null),
    getProjectSpatialHierarchy(id).catch(() => ({ buildings: [] as never[] })),
    getProjectTeam(id).catch(() => []),
  ]);

  if (!projectData) notFound();

  const { project, client } = projectData;
  const latestTour = detail.tours[0];
  const latestScanDate = latestTour?.capture_date ?? latestTour?.created_at ?? null;
  const allowMatterportUpload = user ? canUploadMatterport(user.role) : false;
  const canManageUploads = user
    ? canManageClientUploads(user.role) || can(user.role, "upload", "upload")
    : false;
  const canUploadContent = user
    ? can(user.role, "upload", "reports") || canManageClientUploads(user.role)
    : false;
  const allowIssueStatusUpdate = user ? canUpdateIssueStatus(user.role) : false;
  const allowCreateIssue = user ? canCreateProjectIssue(user.role) : false;
  const canUpdateStatus = user ? can(user.role, "update", "projects") : false;
  const showComments = user ? canCommentOnProject(user.role) : false;

  return (
    <div className="space-y-6">
      <IntelProjectContextBridge
        projectId={project.id}
        projectName={project.name}
        progress={getProjectProgressPercent(project.status)}
        latestScanDate={latestScanDate}
      />
      <ProjectHeader
        project={project}
        client={client}
        latestTour={detail.tours[0] ?? null}
        canUpdateStatus={canUpdateStatus}
        actions={
          canManageUploads ? (
            <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
              <Link href={`/dashboard/projects/${project.id}/upload`}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div id="project-walkthrough">
        <ProjectHubTabs
          projectId={project.id}
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
          allowIssueStatusUpdate={allowIssueStatusUpdate}
          allowCreateIssue={allowCreateIssue}
          canUploadContent={canUploadContent}
        />
      </div>
      {showComments && (
        <ProjectCommentsSection
          projectId={project.id}
          comments={detail.comments}
          currentUserId={user?.id}
          reports={detail.reports}
          documents={detail.documents}
        />
      )}
    </div>
  );
}
