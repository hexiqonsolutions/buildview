"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  setCurrentVisit,
  startHeartbeat,
  trackBeacon,
  trackRequest,
  trackSiteEvent,
  visitorId,
} from "@/lib/analytics/first-party";
import { isMarketingPath } from "@/lib/analytics/classify";

/**
 * Landing-page visitors (first-party): a page view per route, active time
 * while visible, and WhatsApp / login clicks. Conversions from the contact
 * form, demo and sign-up come through trackEvent.
 */
export function SiteTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!pathname || !isMarketingPath(pathname)) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    const { vid, returning } = visitorId();
    const referrer = firstLoad.current ? document.referrer : "";
    firstLoad.current = false;

    void trackRequest<{ visitId?: string; eventId?: string }>({
      t: "page_view",
      vid,
      returning,
      path: pathname,
      search: search?.toString() ? `?${search.toString()}` : "",
      referrer,
    }).then((ids) => {
      if (cancelled || !ids?.visitId) return;
      const visit = { visitId: ids.visitId, eventId: ids.eventId ?? "" };
      setCurrentVisit(visit);
      stop = startHeartbeat(
        (seconds) => trackBeacon({ t: "site_hb", vid, seconds, ...visit }),
        15
      );
    });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [pathname, search]);

  // WhatsApp and login clicks anywhere on the page.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (/wa\.me|whatsapp\.com|api\.whatsapp/i.test(href)) trackSiteEvent("whatsapp_click");
      else if (/^\/login(\b|\/|\?|$)/.test(href)) trackSiteEvent("login_click");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
