export type PlatformSettings = {
  companyName: string;
  supportEmail: string;
  defaultCurrency: string;
  timezone: string;
  notifications: {
    onUpload: boolean;
    onCriticalIssue: boolean;
    onInvoiceSent: boolean;
  };
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  companyName: "BuildView",
  supportEmail: "ops@buildview.com",
  defaultCurrency: "USD",
  timezone: "Asia/Kolkata",
  notifications: {
    onUpload: true,
    onCriticalIssue: true,
    onInvoiceSent: true,
  },
};
