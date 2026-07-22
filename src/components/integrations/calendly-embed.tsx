"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendlyEmbedProps {
  url: string;
  className?: string;
}

export function CalendlyEmbed({ url, className }: CalendlyEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("surface-card overflow-hidden", className)}>
      <div className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-accent-dark" />
          <h3 className="font-display font-semibold text-brand-primary dark:text-white">
            Schedule a live demo
          </h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Pick a time that works for you — we&apos;ll walk you through the platform.
        </p>
      </div>
      <div className="relative min-h-[620px] bg-white">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Loading scheduler…
          </div>
        )}
        <iframe
          src={url}
          title="Schedule a BuildView demo"
          className="h-[620px] w-full border-0"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
