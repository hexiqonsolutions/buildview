"use client";

import { useEffect } from "react";

/** Restores pre–Phase 5 marketing appearance: light content areas, dark heroes via CSS only. */
export function MarketingTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
