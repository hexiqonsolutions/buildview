"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
        <p className="inline-flex items-center gap-2 font-medium">
          <Eye className="h-3.5 w-3.5 text-brand-accent" />
          <span>
            BuildView experience demo — read-only preview. Writes are disabled.
          </span>
        </p>
        <Link
          href="/"
          className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 font-semibold uppercase tracking-wider text-white/90 hover:bg-white/15"
        >
          All demos
        </Link>
      </div>
    </div>
  );
}
