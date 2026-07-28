export type NotificationRuleKey =
  | "onUpload"
  | "onCriticalIssue"
  | "onInvoiceSent"
  | "onInvoicePaid"
  | "onTimeline"
  | "onIssueUpdate"
  | "onProjectAssigned"
  | "onProjectRemoved";

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
  },
};
