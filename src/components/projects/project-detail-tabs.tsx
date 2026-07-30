"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabWorkspace, TabPanel } from "@/components/patterns/tab-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectMatterportPanel } from "@/components/projects/project-matterport-panel";
import { ProjectReportsSection } from "@/components/projects/project-reports-section";
import { ProjectDocumentsSection } from "@/components/projects/project-documents-section";
import { ProjectIssuesSection } from "@/components/projects/project-issues-section";
import { ProjectInvoicesSection } from "@/components/projects/project-invoices-section";
import { TimelineView } from "@/components/projects/timeline-view";
import { BuildingsFloorsManager } from "@/components/admin/projects/buildings-floors-manager";
import { ProjectTeamSection } from "@/components/projects/project-team-section";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { SpatialHierarchy } from "@/lib/actions/buildings";
import type { ProjectTeamMember } from "@/lib/actions/data";
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
  team?: ProjectTeamMember[];
  variant?: "ops" | "intel";
  projectId?: string;
  spatialHierarchy?: SpatialHierarchy;
  /** Admin can add Matterport URLs directly on the project */
  canUploadMatterport?: boolean;
  /** Client/admin can change issue status */
  allowIssueStatusUpdate?: boolean;
  /** Show upload actions inside individual tabs */
  canUploadContent?: boolean;
}

export function ProjectDetailTabs({
  tours,
  reports,
  folders,
  documents,
  issues,
  timeline,
  invoices,
  team = [],
  variant = "ops",
  projectId,
  spatialHierarchy,
  canUploadMatterport = false,
  allowIssueStatusUpdate = false,
  canUploadContent = false,
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
    { id: "team", label: "Team", badge: team.length },
    ...(showConstructionTabs
      ? [
          { id: "issues", label: "Issues", badge: issues.length },
          { id: "invoices", label: "Invoices", badge: invoices.length },
        ]
      : []),
  ];

  const uploadHref = projectId ? `/dashboard/projects/${projectId}/upload` : null;

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
            <TabSectionHeader
              title="Timeline"
              description="Progress milestones, photos, and notes."
              canUpload={canUploadContent}
              uploadHref={uploadHref ? `${uploadHref}?type=timeline` : undefined}
              uploadLabel="Add Update"
            />
            <TimelineView events={timeline} />
          </TabPanel>

          <TabPanel value="reports" className="mt-6">
            <TabSectionHeader
              title="Reports"
              description="Progress and inspection reports."
              canUpload={canUploadContent}
              uploadHref={uploadHref ? `${uploadHref}?type=report` : undefined}
              uploadLabel="Upload Report"
            />
            <ProjectReportsSection reports={reports} />
          </TabPanel>
        </>
      )}

      <TabPanel value="documents" className="mt-6">
        <TabSectionHeader
          title="Documents"
          description="Drawings, contracts, and project files."
          canUpload={canUploadContent}
          uploadHref={uploadHref ? `${uploadHref}?type=drawing` : undefined}
          uploadLabel="Upload Document"
        />
        <ProjectDocumentsSection folders={folders} documents={documents} />
      </TabPanel>

      <TabPanel value="team" className="mt-6">
        <TabSectionHeader
          title="Project Team"
          description="People assigned to this project and their roles."
          canUpload={false}
          uploadLabel=""
        />
        <ProjectTeamSection members={team} />
      </TabPanel>

      {showConstructionTabs && (
        <>
          <TabPanel value="issues" className="mt-6">
            <TabSectionHeader
              title="Issues"
              description="Construction issues and defects."
              canUpload={canUploadContent}
              uploadHref={uploadHref ? `${uploadHref}?type=issue` : undefined}
              uploadLabel="Report Issue"
            />
            <ProjectIssuesSection
              issues={issues}
              allowStatusUpdate={allowIssueStatusUpdate}
            />
          </TabPanel>

          <TabPanel value="invoices" className="mt-6">
            <ProjectInvoicesSection invoices={invoices} />
          </TabPanel>
        </>
      )}
    </TabWorkspace>
  );
}

function TabSectionHeader({
  title,
  description,
  canUpload,
  uploadHref,
  uploadLabel,
}: {
  title: string;
  description: string;
  canUpload: boolean;
  uploadHref?: string;
  uploadLabel: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {canUpload && uploadHref && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 border-slate-200 text-slate-700 transition-colors hover:border-brand-accent hover:bg-brand-accent/5 hover:text-brand-accent dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-accent"
        >
          <Link href={uploadHref}>
            <Plus className="h-3.5 w-3.5" />
            {uploadLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}
