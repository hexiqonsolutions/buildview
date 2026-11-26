export type NotificationRuleKey =
  | "onUpload"
  | "onCriticalIssue"
  | "onInvoiceSent"
  | "onInvoicePaid"
  | "onTimeline"
  | "onIssueUpdate"
  | "onProjectAssigned"
  | "onProjectRemoved"
  | "onTourViewer"
  | "onSiteActivity"
  | "onComment";

export type PlatformSettings = {
  companyName: string;
  supportEmail: string;
  defaultCurrency: string;
  timezone: string;
  notifications: Record<NotificationRuleKey, boolean>;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  companyName: "BuildView",
  supportEmail: "ops@buildview.com",
  defaultCurrency: "INR",
  timezone: "Asia/Kolkata",
  notifications: {
    onUpload: true,
    onCriticalIssue: true,
    onInvoiceSent: true,
    onInvoicePaid: true,
    onTimeline: true,
    onIssueUpdate: true,
    onProjectAssigned: true,
    onProjectRemoved: true,
    /** Staff (tour_viewers permission) when a new share-gate viewer is recorded. */
    onTourViewer: true,
    /** Checklist steps, zone updates, evidence and reviews → project team. */
    onSiteActivity: true,
    /** Comments and replies → project team. */
    onComment: true,
  },
};
