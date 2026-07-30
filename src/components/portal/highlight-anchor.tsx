"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Scrolls to and briefly rings an item when `highlightId` matches `id`. */
export function HighlightAnchor({
  id,
  highlightId,
  className,
  children,
}: {
  id: string;
  highlightId?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = Boolean(highlightId && highlightId === id);

  useEffect(() => {
    if (!active || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  return (
    <div
      ref={ref}
      id={id}
      className={cn(
        className,
        active &&
          "rounded-xl ring-2 ring-slate-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
      )}
    >
      {children}
    </div>
  );
}
