"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/analytics/consent";
import { isGoogleAnalyticsEnabled } from "@/lib/integrations";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readCookieConsent()) {
      setVisible(true);
    }
  }, []);

  function accept() {
    writeCookieConsent("accepted");
    setVisible(false);
  }

  function dismiss() {
    writeCookieConsent("dismissed");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  const mentionsAnalytics = isGoogleAnalyticsEnabled();

  return (
    <div
      className="fixed bottom-4 z-[60] mx-auto max-w-2xl animate-slide-up"
      style={{
        left: "var(--site-gutter)",
        right: "var(--site-gutter)",
      }}
    >
      <div className="surface-card flex flex-col gap-4 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {mentionsAnalytics
            ? "We use cookies for analytics and to improve your experience. Analytics loads only if you accept."
            : "We use essential cookies to operate the site."}{" "}
          See our{" "}
          <Link href="/cookies" className="font-medium text-brand-accent-dark hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Decline
          </Button>
          <Button variant="accent" size="sm" onClick={accept}>
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="sm:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
