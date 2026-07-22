"use client";

import { TabWorkspace, TabPanel } from "@/components/patterns/tab-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectMatterportPanel } from "@/components/projects/project-matterport-panel";
import { ProjectReportsSection } from "@/components/projects/project-reports-section";
import { ProjectDocumentsSection } from "@/components/projects/project-documents-section";
import { ProjectIssuesSection } from "@/components/projects/project-issues-section";
import { ProjectInvoicesSection } from "@/components/projects/project-invoices-section";
import { TimelineView } from "@/components/projects/timeline-view";
import { BuildingsFloorsManager } from "@/components/admin/projects/buildings-floors-manager";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { SpatialHierarchy } from "@/lib/actions/buildings";
import type {
  ProjectTour,
  Report,
  Document,
  DocumentFolder,
  IssueWithRelations,
  TimelineEventWithRelations,
  Invoice,
} from "@/lib/types";

interface ProjectDetailTabsProps {
  tours: ProjectTour[];
  reports: Report[];
  folders: DocumentFolder[];
  documents: Document[];
  issues: IssueWithRelations[];
  timeline: TimelineEventWithRelations[];
  invoices: Invoice[];
  variant?: "ops" | "intel";
  projectId?: string;
  spatialHierarchy?: SpatialHierarchy;
  /** Admin can add Matterport URLs directly on the project */
  canUploadMatterport?: boolean;
}

export function ProjectDetailTabs({
  tours,
  reports,
  folders,
  documents,
  issues,
  timeline,
  invoices,
  variant = "ops",
  projectId,
  spatialHierarchy,
  canUploadMatterport = false,
}: ProjectDetailTabsProps) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolioIntel = variant === "intel" && portal?.dashboardType === "portfolio";
  const showConstructionTabs = variant === "ops" || !isPortfolioIntel;

  const openIssueCount = issues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(variant === "ops"
      ? [{ id: "spatial", label: "Buildings", badge: spatialHierarchy?.buildings.length }]
      : []),
    ...(showConstructionTabs
      ? [
          { id: "timeline", label: "Timeline", badge: timeline.length },
          { id: "reports", label: "Reports", badge: reports.length },
        ]
      : []),
    { id: "documents", label: "Documents", badge: documents.length },
    ...(showConstructionTabs
      ? [
          { id: "issues", label: "Issues", badge: issues.length },
          { id: "invoices", label: "Invoices", badge: invoices.length },
        ]
      : []),
  ];

  return (
    <TabWorkspace variant={variant} defaultTab="overview" tabs={tabs}>
      <TabPanel value="overview" className="mt-6 space-y-8">
        {projectId ? (
          <ProjectMatterportPanel
            projectId={projectId}
            tours={tours}
            canUpload={canUploadMatterport}
          />
        ) : null}

        {showConstructionTabs && (
          <ProjectOverview
            tourCount={tours.length}
            reportCount={reports.length}
            documentCount={documents.length}
            openIssueCount={openIssueCount}
          />
        )}
      </TabPanel>

      {variant === "ops" && projectId && spatialHierarchy && (
        <TabPanel value="spatial" className="mt-6">
          <BuildingsFloorsManager projectId={projectId} initialHierarchy={spatialHierarchy} />
        </TabPanel>
      )}

      {showConstructionTabs && (
        <>
          <TabPanel value="timeline" className="mt-6">
            <TimelineView events={timeline} />
          </TabPanel>

          <TabPanel value="reports" className="mt-6">
            <ProjectReportsSection reports={reports} />
          </TabPanel>
        </>
      )}

      <TabPanel value="documents" className="mt-6">
        <ProjectDocumentsSection folders={folders} documents={documents} />
      </TabPanel>

      {showConstructionTabs && (
        <>
          <TabPanel value="issues" className="mt-6">
            <ProjectIssuesSection issues={issues} />
          </TabPanel>

          <TabPanel value="invoices" className="mt-6">
            <ProjectInvoicesSection invoices={invoices} />
          </TabPanel>
        </>
      )}
    </TabWorkspace>
  );
}
