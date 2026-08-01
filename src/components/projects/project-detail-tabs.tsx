"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabWorkspace, TabPanel } from "@/components/patterns/tab-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectMatterportPanel } from "@/components/projects/project-matterport-panel";
import { ProjectReportsSection } from "@/components/projects/project-reports-section";
import { ProjectDocumentsSection } from "@/components/projects/project-documents-section";
import { ProjectIssuesSection } from "@/components/projects/project-issues-section";
import { ProjectInvoicesSection } from "@/components/projects/project-invoices-section";
import {
  ProjectSitePhotosSection,
  flattenProjectSitePhotos,
} from "@/components/projects/project-site-photos-section";
import { TimelineView } from "@/components/projects/timeline-view";
import { BuildingsFloorsManager } from "@/components/admin/projects/buildings-floors-manager";
import { ProjectTeamSection } from "@/components/projects/project-team-section";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
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
  /** Any project-connected client role can report issues */
  allowCreateIssue?: boolean;
  /** Client Admin only — invoices tab */
  allowInvoices?: boolean;
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
  allowCreateIssue = false,
  allowInvoices = false,
  canUploadContent = false,
}: ProjectDetailTabsProps) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolioIntel = variant === "intel" && portal?.dashboardType === "portfolio";
  const showConstructionTabs = variant === "ops" || !isPortfolioIntel;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openIssueCount = issues.filter(
    (i) => i.status === "open" || i.status === "in_progress"
  ).length;
  const sitePhotoCount = flattenProjectSitePhotos(timeline).length;

  const openScansTab = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "scans");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "scans", label: isPortfolioIntel ? "Walkthroughs" : "Scans", badge: tours.length },
    ...(variant === "ops"
      ? [{ id: "spatial", label: "Buildings", badge: spatialHierarchy?.buildings.length }]
      : []),
    ...(showConstructionTabs
      ? [
          { id: "photos", label: "Site Images", badge: sitePhotoCount },
          { id: "timeline", label: "Timeline", badge: timeline.length },
          { id: "reports", label: "Reports", badge: reports.length },
        ]
      : []),
    { id: "documents", label: "Documents", badge: documents.length },
    { id: "team", label: "Team", badge: team.length },
    ...(showConstructionTabs
      ? [
          { id: "issues", label: "Issues", badge: issues.length },
          ...(allowInvoices
            ? [{ id: "invoices", label: "Invoices", badge: invoices.length }]
            : []),
        ]
      : []),
  ];

  const uploadHref = projectId ? `/dashboard/projects/${projectId}/upload` : null;

  return (
    <TabWorkspace variant={variant} defaultTab="overview" tabs={tabs}>
      <TabPanel value="overview" className="mt-6 space-y-8">
        {isPortfolioIntel && projectId ? (
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

        {!isPortfolioIntel && projectId && tours.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This project has{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {tours.length} Matterport scan{tours.length === 1 ? "" : "s"}
              </span>
              . Open the Scans tab to browse the full library and compare any two.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={openScansTab}>
              View all scans
            </Button>
          </div>
        ) : !isPortfolioIntel && projectId && tours.length === 0 ? (
          <ProjectMatterportPanel
            projectId={projectId}
            tours={tours}
            canUpload={canUploadMatterport}
          />
        ) : null}
      </TabPanel>

      <TabPanel value="scans" className="mt-6">
        {projectId ? (
          <ProjectMatterportPanel
            projectId={projectId}
            tours={tours}
            canUpload={canUploadMatterport}
          />
        ) : null}
      </TabPanel>

      {variant === "ops" && projectId && spatialHierarchy && (
        <TabPanel value="spatial" className="mt-6">
          <BuildingsFloorsManager projectId={projectId} initialHierarchy={spatialHierarchy} />
        </TabPanel>
      )}

      {showConstructionTabs && (
        <>
          <TabPanel value="photos" className="mt-6">
            <TabSectionHeader
              title="Site Images"
              description="All site photography for this project."
              canUpload={canUploadContent}
              uploadHref={uploadHref ? `${uploadHref}?type=site_photos` : undefined}
              uploadLabel="Upload Photos"
            />
            <ProjectSitePhotosSection timeline={timeline} />
          </TabPanel>

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
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Issues
                </h3>
                <p className="text-sm text-slate-500">
                  Construction issues and defects. Everyone on the project can report; only Client
                  Admin, Site Supervisor, and Site Engineer can change status.
                </p>
              </div>
              {allowCreateIssue && projectId ? (
                <CreateIssueDialog
                  projects={[{ id: projectId, name: "This project" }]}
                  defaultProjectId={projectId}
                />
              ) : null}
            </div>
            <ProjectIssuesSection
              issues={issues}
              allowStatusUpdate={allowIssueStatusUpdate}
              allowCreate={allowCreateIssue}
              projectId={projectId}
            />
          </TabPanel>

          {allowInvoices && (
            <TabPanel value="invoices" className="mt-6">
              <ProjectInvoicesSection invoices={invoices} />
            </TabPanel>
          )}
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
          className="shrink-0 gap-1.5 border-slate-200 text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
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
