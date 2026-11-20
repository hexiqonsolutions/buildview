"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabWorkspace, TabPanel } from "@/components/patterns/tab-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectAiSummaryPanel } from "@/components/projects/project-ai-summary-panel";
import { buildProjectReportSummary } from "@/lib/ai/build-project-report-summary";
import { isOpenIssueStatus } from "@/lib/issues/status";
import { useOptionalPortalWorkspace } from "@/components/portal/workspace/portal-workspace-provider";
import type { ProjectMediaGroups } from "@/lib/project-media";
import type { BuyerProperty } from "@/lib/property/buyer-view";
import type { SpatialHierarchy } from "@/lib/actions/buildings";
import type { ProjectTeamMember } from "@/lib/data/projects";
import type { ProjectProgressionBundle } from "@/lib/progression/types";
import type {
  ProjectTour,
  Report,
  Document,
  DocumentFolder,
  IssueWithRelations,
  TimelineEventWithRelations,
  Invoice,
  ProjectCommentWithUser,
} from "@/lib/types";

function TabLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading…
    </div>
  );
}

const ProjectMatterportPanel = dynamic(
  () =>
    import("@/components/projects/project-matterport-panel").then(
      (mod) => mod.ProjectMatterportPanel
    ),
  { loading: () => <TabLoading /> }
);
const ProjectReportsSection = dynamic(
  () =>
    import("@/components/projects/project-reports-section").then(
      (mod) => mod.ProjectReportsSection
    ),
  { loading: () => <TabLoading /> }
);
const ProgressionPanel = dynamic(
  () =>
    import("@/components/projects/progression/progression-panel").then(
      (mod) => mod.ProgressionPanel
    ),
  { loading: () => <TabLoading /> }
);
const ProjectCommentsSection = dynamic(
  () =>
    import("@/components/projects/project-comments-section").then(
      (mod) => mod.ProjectCommentsSection
    ),
  { loading: () => <TabLoading /> }
);
const ProjectDocumentsSection = dynamic(
  () =>
    import("@/components/projects/project-documents-section").then(
      (mod) => mod.ProjectDocumentsSection
    ),
  { loading: () => <TabLoading /> }
);
const ProjectIssuesSection = dynamic(
  () =>
    import("@/components/projects/project-issues-section").then(
      (mod) => mod.ProjectIssuesSection
    ),
  { loading: () => <TabLoading /> }
);
const ProjectInvoicesSection = dynamic(
  () =>
    import("@/components/projects/project-invoices-section").then(
      (mod) => mod.ProjectInvoicesSection
    ),
  { loading: () => <TabLoading /> }
);
const ProjectSitePhotosSection = dynamic(
  () =>
    import("@/components/projects/project-site-photos-section").then(
      (mod) => mod.ProjectSitePhotosSection
    ),
  { loading: () => <TabLoading /> }
);
const TimelineView = dynamic(
  () =>
    import("@/components/projects/timeline-view").then((mod) => mod.TimelineView),
  { loading: () => <TabLoading /> }
);
const BuildingsFloorsManager = dynamic(
  () =>
    import("@/components/admin/projects/buildings-floors-manager").then(
      (mod) => mod.BuildingsFloorsManager
    ),
  { loading: () => <TabLoading /> }
);
const ProjectTeamSection = dynamic(
  () =>
    import("@/components/projects/project-team-section").then(
      (mod) => mod.ProjectTeamSection
    ),
  { loading: () => <TabLoading /> }
);
const CreateIssueDialog = dynamic(
  () =>
    import("@/components/issues/create-issue-dialog").then(
      (mod) => mod.CreateIssueDialog
    ),
  { ssr: false }
);
const PropertyPage = dynamic(
  () => import("@/components/property/property-page").then((mod) => mod.PropertyPage)
);

const ProjectMediaShowcase = dynamic(
  () =>
    import("@/components/projects/project-media-showcase").then(
      (mod) => mod.ProjectMediaShowcase
    ),
  { loading: () => <TabLoading /> }
);

interface ProjectDetailTabsProps {
  projectName?: string;
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
  /** Portfolio showcase Videos & Photos */
  media?: ProjectMediaGroups;
  /** Construction Progression Report (null / undefined for portfolio or missing migration). */
  progression?: ProjectProgressionBundle | null;
  /**
   * BuildView staff + client_admin + site_supervisor + site_engineer.
   * When false, Progression tab and overview summary are hidden.
   */
  allowProgression?: boolean;
  /** Team Discussion rendered inside Overview (not below all tabs). */
  comments?: ProjectCommentWithUser[];
  currentUserId?: string;
  showComments?: boolean;
  /** Portfolio portal: buyer-facing property page (replaces the plain tour + media overview). */
  property?: BuyerProperty | null;
  /** Admin only: "Property details" editor for portfolio projects. */
  propertyTab?: ReactNode;
}

export function ProjectDetailTabs({
  projectName = "This project",
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
  media,
  progression = null,
  allowProgression = false,
  comments = [],
  currentUserId,
  showComments = false,
  propertyTab,
  property = null,
}: ProjectDetailTabsProps) {
  const portal = useOptionalPortalWorkspace();
  const isPortfolioIntel = variant === "intel" && portal?.dashboardType === "portfolio";
  const showConstructionTabs = variant === "ops" || !isPortfolioIntel;
  const showProgression = Boolean(showConstructionTabs && allowProgression && progression);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openIssueCount = issues.filter(
    (i) => isOpenIssueStatus(i.status)
  ).length;
  const sitePhotoCount = timeline.reduce(
    (sum, event) =>
      sum + (event.timeline_photos?.filter((photo) => !photo.deleted_at).length ?? 0),
    0
  );

  const openScansTab = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "scans");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(propertyTab ? [{ id: "property", label: "Property details" }] : []),
    { id: "scans", label: isPortfolioIntel ? "Walkthroughs" : "Scans", badge: tours.length },
    ...(variant === "ops"
      ? [{ id: "spatial", label: "Buildings", badge: spatialHierarchy?.buildings.length }]
      : []),
    ...(showConstructionTabs
      ? [
          { id: "photos", label: "Site Images", badge: sitePhotoCount },
          { id: "timeline", label: "Timeline", badge: timeline.length },
          ...(showProgression && progression
            ? [
                {
                  id: "progression",
                  label: "Progression",
                  badge:
                    progression.floorCount > 0
                      ? `${progression.overallPercent}%`
                      : "—",
                },
              ]
            : []),
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

  const aiSummary = useMemo(
    () =>
      buildProjectReportSummary({
        projectName,
        reports,
        issues,
        timeline,
      }),
    [projectName, reports, issues, timeline]
  );

  return (
    <TabWorkspace variant={variant} defaultTab="overview" tabs={tabs}>
      <TabPanel value="overview" className="mt-4 space-y-5 sm:mt-6 sm:space-y-8">
        {isPortfolioIntel && property ? (
          <PropertyPage
            view={property}
            tour={
              projectId ? (
                <ProjectMatterportPanel
                  projectId={projectId}
                  tours={tours}
                  canUpload={canUploadMatterport}
                />
              ) : undefined
            }
          />
        ) : null}

        {isPortfolioIntel && !property && projectId ? (
          <ProjectMatterportPanel
            projectId={projectId}
            tours={tours}
            canUpload={canUploadMatterport}
          />
        ) : null}

        {isPortfolioIntel && !property && media ? <ProjectMediaShowcase media={media} /> : null}

        {showConstructionTabs && (
          <ProjectOverview
            tourCount={tours.length}
            reportCount={reports.length}
            documentCount={documents.length}
            openIssueCount={openIssueCount}
          />
        )}

        {showProgression && progression ? (
          <ProgressionPanel initial={progression} summaryOnly />
        ) : null}

        {showConstructionTabs ? (
          <ProjectAiSummaryPanel summary={aiSummary} />
        ) : null}

        {!isPortfolioIntel && projectId && tours.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This project has{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {tours.length} virtual tour scan{tours.length === 1 ? "" : "s"}
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

        {showComments && projectId ? (
          <ProjectCommentsSection
            projectId={projectId}
            comments={comments}
            currentUserId={currentUserId}
            reports={reports}
            documents={documents}
          />
        ) : null}
      </TabPanel>

      {propertyTab ? (
        <TabPanel value="property" className="mt-6">
          {propertyTab}
        </TabPanel>
      ) : null}

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

          {showProgression && progression ? (
            <TabPanel value="progression" className="mt-6">
              <ProgressionPanel initial={progression} checklistOnly />
            </TabPanel>
          ) : null}

          <TabPanel value="reports" className="mt-6 space-y-6">
            <TabSectionHeader
              title="Reports"
              description="Progress and inspection reports."
              canUpload={canUploadContent}
              uploadHref={uploadHref ? `${uploadHref}?type=report` : undefined}
              uploadLabel="Upload Report"
            />
            <ProjectAiSummaryPanel summary={aiSummary} compact />
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
