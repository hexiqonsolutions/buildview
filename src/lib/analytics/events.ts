export const analyticsEvents = {
  pageView: "PageView",
  viewContent: "ViewContent",
  lead: "Lead",
  contact: "Contact",
  bookDemo: "BookDemo",
  signUp: "SignUp",
  ctaClick: "CtaClick",
} as const;

export type AnalyticsEventName =
  (typeof analyticsEvents)[keyof typeof analyticsEvents];

export const metaStandardEvents: Record<
  AnalyticsEventName,
  { type: "track" | "trackCustom"; name: string }
> = {
  PageView: { type: "track", name: "PageView" },
  ViewContent: { type: "track", name: "ViewContent" },
  Lead: { type: "track", name: "Lead" },
  Contact: { type: "track", name: "Contact" },
  BookDemo: { type: "trackCustom", name: "BookDemo" },
  SignUp: { type: "track", name: "CompleteRegistration" },
  CtaClick: { type: "trackCustom", name: "CtaClick" },
};

export const gaEventNames: Record<AnalyticsEventName, string> = {
  PageView: "page_view",
  ViewContent: "view_item",
  Lead: "generate_lead",
  Contact: "contact",
  BookDemo: "book_demo",
  SignUp: "sign_up",
  CtaClick: "cta_click",
};
