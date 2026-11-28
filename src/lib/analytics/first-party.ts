"use client";

import { hasAnalyticsConsent } from "@/lib/analytics/consent";

/**
 * Browser side of first-party analytics. Anonymous visitor ID: kept in
 * localStorage only when analytics cookies are accepted; otherwise it lives
 * for this browser session only (counted, never remembered).
 */

const VID_KEY = "bv_vid";
const SEEN_KEY = "bv_seen";
const VISIT_KEY = "bv_visit";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function store(persistent: boolean): Storage | null {
  try {
    return persistent ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function visitorId(): { vid: string; returning: boolean } {
  const persistent = hasAnalyticsConsent();
  const s = store(persistent);
  let vid = s?.getItem(VID_KEY) ?? null;
  if (!vid) {
    vid = newId();
    s?.setItem(VID_KEY, vid);
  }
  let returning = false;
  if (persistent) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const seen = localStorage.getItem(SEEN_KEY);
      returning = Boolean(seen && seen !== today);
      if (!seen) localStorage.setItem(SEEN_KEY, today);
    } catch {
      /* ignore */
    }
  }
  return { vid, returning };
}

/** Current website visit (set by the site tracker) for events on later pages. */
export function currentVisit(): { visitId: string; eventId: string } | null {
  try {
    const raw = sessionStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as { visitId: string; eventId: string }) : null;
  } catch {
    return null;
  }
}

export function setCurrentVisit(v: { visitId: string; eventId: string }) {
  try {
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

/** POST and read the reply (opens / page views that need ids back). */
export async function trackRequest<T = Record<string, unknown>>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Fire-and-forget (heartbeats, events; survives page unload). */
export function trackBeacon(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Record a conversion / click against the current website visit, if any. */
export function trackSiteEvent(name: string): void {
  const visit = currentVisit();
  if (!visit) return;
  const { vid } = visitorId();
  trackBeacon({ t: "event", visitId: visit.visitId, vid, name, path: window.location.pathname });
}

/**
 * Count active seconds while the page is visible: calls `send(seconds)` every
 * `everySeconds` and once on hide. Returns a cleanup function.
 */
export function startHeartbeat(send: (seconds: number) => void, everySeconds: number): () => void {
  let visibleSince = document.visibilityState === "visible" ? Date.now() : null;
  const flush = () => {
    if (visibleSince == null) return;
    const seconds = Math.round((Date.now() - visibleSince) / 1000);
    visibleSince = document.visibilityState === "visible" ? Date.now() : null;
    if (seconds > 0) send(seconds);
  };
  const timer = window.setInterval(flush, everySeconds * 1000);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
    else visibleSince = Date.now();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);
  return () => {
    flush();
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
  };
}
