"use client";

import { useEffect } from "react";

/** Applies saved portal theme preference (dashboard/admin only). */
export function PortalTheme() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = stored === "dark" || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", useDark);
  }, []);

  return null;
}
