import { CheckCircle2, CircleDashed, Plug } from "lucide-react";
import type { IntegrationsStatus } from "@/lib/actions/integrations-status";
import { cn } from "@/lib/utils";

const items: Array<{
  key: keyof IntegrationsStatus;
  label: string;
  description: string;
  envHint: string;
}> = [
  {
    key: "contactEmail",
    label: "Contact form email",
    description: "Resend delivery for /contact submissions",
    envHint: "RESEND_API_KEY, CONTACT_TO_EMAIL",
  },
  {
    key: "notificationEmail",
    label: "Notification email",
    description: "Transactional alerts from the operations portal",
    envHint: "RESEND_API_KEY (+ optional NOTIFICATION_FROM_EMAIL)",
  },
  {
    key: "googleAnalytics",
    label: "Google Analytics",
    description: "GA4 on marketing pages (consent-gated)",
    envHint: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  },
  {
    key: "calendly",
    label: "Calendly scheduler",
    description: "Inline demo booking on Contact and Pricing",
    envHint: "NEXT_PUBLIC_CALENDLY_URL",
  },
  {
    key: "siteUrl",
    label: "Public site URL",
    description: "Canonical URLs, sitemap, and auth email links",
    envHint: "NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL",
  },
  {
    key: "cronSecret",
    label: "Cron / internal jobs",
    description: "Secures /api/internal/sync-users and similar routes",
    envHint: "CRON_SECRET",
  },
];

export function IntegrationsStatusPanel({ status }: { status: IntegrationsStatus }) {
  const enabledCount = items.filter((item) => status[item.key]).length;

  return (
    <section className="ops-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <Plug className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Integrations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {enabledCount} of {items.length} integrations configured via environment variables.
          </p>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => {
          const active = status[item.key];
          return (
            <li key={item.key} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{item.envHint}</p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {active ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <CircleDashed className="h-3.5 w-3.5" />
                )}
                {active ? "Active" : "Not set"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-slate-500">
        Configure in <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">.env.local</code>{" "}
        locally or Vercel → Project Settings → Environment Variables in production.
      </p>
    </section>
  );
}
