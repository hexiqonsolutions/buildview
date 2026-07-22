"use client";

import { useEffect } from "react";

/** Auth pages use a fixed light form panel (pre–Phase 5). */
export function AuthTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
