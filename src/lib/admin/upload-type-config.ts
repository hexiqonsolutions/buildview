import type { UploadCategory } from "@/lib/actions/upload-orchestrator";

export type UploadWizardStep = "workspace" | "category" | "details" | "review" | "success";

export const WIZARD_STEPS: { id: UploadWizardStep; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "category", label: "Type" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "success", label: "Done" },
];

/** Normalize quick-action `?type=` values to upload categories */
export function resolveUploadCategoryFromParam(type: string | null): UploadCategory {
  switch (type) {
    case "matterport":
      return "matterport";
    case "report":
    case "progress_report":
      return "progress_report";
    case "drawing":
    case "drawings":
      return "drawings";
    case "photo":
    case "site_photos":
      return "site_photos";
    case "issue":
      return "issue";
    case "timeline":
    case "timeline_update":
      return "timeline_update";
    default:
      return "matterport";
  }
}

export type AutomationPreview = {
  timeline: boolean;
  activity: boolean;
  clientNotify: boolean;
  adminNotify: boolean;
  label: string;
};

export function getAutomationPreview(category: UploadCategory): AutomationPreview {
  switch (category) {
    case "matterport":
      return {
        label: "Matterport tour",
        timeline: true,
        activity: true,
        clientNotify: true,
        adminNotify: false,
      };
    case "progress_report":
    case "inspection_report":
    case "safety_report":
      return {
        label: "Report",
        timeline: true,
        activity: true,
        clientNotify: true,
        adminNotify: false,
      };
    case "drawings":
    case "boqs":
    case "contracts":
    case "invoices_doc":
    case "other":
      return {
        label: "Document",
        timeline: true,
        activity: true,
        clientNotify: true,
        adminNotify: false,
      };
    case "site_photos":
      return {
        label: "Site photos",
        timeline: true,
        activity: true,
        clientNotify: false,
        adminNotify: false,
      };
    case "timeline_update":
      return {
        label: "Timeline milestone",
        timeline: true,
        activity: true,
        clientNotify: false,
        adminNotify: false,
      };
    case "issue":
      return {
        label: "Issue",
        timeline: true,
        activity: true,
        clientNotify: false,
        adminNotify: true,
      };
    default:
      return {
        label: "Upload",
        timeline: false,
        activity: true,
        clientNotify: false,
        adminNotify: false,
      };
  }
}

export const REPORT_TYPE_CATEGORIES = new Set<UploadCategory>([
  "progress_report",
  "inspection_report",
  "safety_report",
]);

export const DOC_CATEGORY_MAP: Partial<Record<UploadCategory, string>> = {
  drawings: "drawings",
  boqs: "boqs",
  contracts: "contracts",
  invoices_doc: "other",
  other: "other",
};

export function categoryNeedsFile(category: UploadCategory): boolean {
  return (
    REPORT_TYPE_CATEGORIES.has(category) ||
    category in DOC_CATEGORY_MAP ||
    category === "site_photos" ||
    category === "issue"
  );
}

export function categoryNeedsMatterportUrl(category: UploadCategory): boolean {
  return category === "matterport";
}

export function categoryIsTimelineOnly(category: UploadCategory): boolean {
  return category === "timeline_update";
}

export function categoryIsIssue(category: UploadCategory): boolean {
  return category === "issue";
}
