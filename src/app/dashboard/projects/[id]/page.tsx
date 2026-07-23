import { notFound } from "next/navigation";
import { getProjectWithClient, getProjectDetail, getProjectInvoices } from "@/lib/actions/data";
import { getProjectSpatialHierarchy } from "@/lib/actions/buildings";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectHubTabs } from "@/components/intel/projects/project-hub-tabs";
import { IntelProjectContextBridge } from "@/components/intel/shell/intel-project-context";
import { getCurrentUser } from "@/lib/actions/auth";
import { can } from "@/lib/auth/permissions";
import { getProjectProgressPercent } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [projectData, detail, invoices, user, spatialHierarchyResult] = await Promise.all([
    getProjectWithClient(id),
    getProjectDetail(id),
    getProjectInvoices(id),
    getCurrentUser(),
    getProjectSpatialHierarchy(id).catch(() => ({ buildings: [] })),
  ]);
  const spatialHierarchy = spatialHierarchyResult ?? { buildings: [] };

  if (!projectData) notFound();

  const { project, client } = projectData;
  const latestTour = detail.tours[0];
  const latestScanDate = latestTour?.capture_date ?? latestTour?.created_at ?? null;
  const canUploadMatterport = user ? can(user.role, "upload", "matterport") : false;

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
          canUploadMatterport={canUploadMatterport}
        />
      </div>
    </div>
  );
}
