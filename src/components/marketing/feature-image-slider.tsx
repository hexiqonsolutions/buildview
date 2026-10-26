"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type FeatureSlide = {
  src: string;
  alt: string;
  label: string;
};

interface FeatureImageSliderProps {
  slides: FeatureSlide[];
  className?: string;
  /** Auto-advance interval in ms. Set 0 to disable. */
  intervalMs?: number;
}

export function FeatureImageSlider({
  slides,
  className,
  intervalMs = 4000,
}: FeatureImageSliderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2 || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  const active = slides[index] ?? slides[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-16/10 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
        {slides.map((slide, i) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className={cn(
              "object-cover object-top transition-opacity duration-500",
              i === index ? "opacity-100" : "opacity-0"
            )}
            priority={i === 0}
          />
        ))}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {active.label}
        </span>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show ${slide.label}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 cursor-pointer rounded-full transition-all duration-200",
              i === index
                ? "w-6 bg-brand-accent"
                : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
            )}
          />
        ))}
      </div>
    </div>
  );
}
