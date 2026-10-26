"use client";

import { useEffect, useRef } from "react";
import { endPresence, pingPresence } from "@/lib/actions/presence";
import type { UserSessionArea } from "@/lib/types";

const HEARTBEAT_MS = 60_000;
/** End the open session after the tab stays hidden this long. */
const HIDDEN_END_MS = 5 * 60_000;

/**
 * Invisible tracker that records real time spent on the site while the user
 * is signed in and the tab is visible. Mount once in admin and portal shells.
 */
export function PresenceTracker({ area }: { area: UserSessionArea }) {
  const areaRef = useRef(area);
  areaRef.current = area;
  const hiddenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearHiddenTimer = () => {
      if (hiddenTimer.current) {
        clearTimeout(hiddenTimer.current);
        hiddenTimer.current = null;
      }
    };

    const beat = () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void pingPresence(areaRef.current);
    };

    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(beat, HEARTBEAT_MS);
    };

    const stopInterval = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    // Immediate first ping so short visits still count.
    beat();
    startInterval();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        clearHiddenTimer();
        beat();
        startInterval();
        return;
      }
      stopInterval();
      clearHiddenTimer();
      hiddenTimer.current = setTimeout(() => {
        void endPresence();
      }, HIDDEN_END_MS);
    };

    const onPageHide = () => {
      clearHiddenTimer();
      void endPresence();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      stopInterval();
      clearHiddenTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      void endPresence();
    };
  }, []);

  return null;
}
