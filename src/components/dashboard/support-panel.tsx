"use client";

import { LifeBuoy, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupportPanelProps {
  supportEmail: string;
  supportPhone: string;
  userEmail?: string;
  userName?: string;
}

export function SupportPanel({
  supportEmail,
  supportPhone,
  userEmail,
  userName,
}: SupportPanelProps) {
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "BuildView portal support"
  )}&body=${encodeURIComponent(
    `Hi BuildView team,\n\nI need help with the portal.\n\nAccount: ${userEmail ?? ""}\nName: ${userName ?? ""}\n\nIssue:\n`
  )}`;

  return (
    <div className="portal-card mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <LifeBuoy className="h-4 w-4 text-slate-400" />
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Need help?
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        For portal access, projects, walkthroughs, or account questions, reach the BuildView team.
        We typically respond within one business day.
      </p>

      <dl className="mt-5 space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Support email</dt>
            <dd className="mt-1">
              <a
                href={mailtoHref}
                className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                {supportEmail}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <dt className="text-xs text-slate-500">Phone</dt>
            <dd className="mt-1">
              <a
                href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
              >
                {supportPhone}
              </a>
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <a href={mailtoHref}>Email support</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/contact" target="_blank" rel="noopener noreferrer">
            Contact us
          </a>
        </Button>
      </div>
    </div>
  );
}
