"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Full-bleed hero media plane.
 * Place capture video at: public/videos/walkthrough-capture.mp4
 * Optional poster: public/videos/walkthrough-capture-poster.jpg
 * Video sources load only after the hero enters the viewport.
 */
export function HeroCaptureVideo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 z-0 overflow-hidden bg-brand-primary", className)}
      aria-hidden
    >
      <div className="absolute inset-0 mesh-gradient" />
      <div className="dot-pattern absolute inset-0 opacity-30" />

      {shouldLoad ? (
        <video
          className="absolute inset-0 h-full w-full scale-105 object-cover motion-safe:animate-hero-ken"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/walkthrough-capture-poster.jpg"
        >
          <source src="/videos/walkthrough-capture.mp4" type="video/mp4" />
          <source src="/videos/walkthrough-capture.webm" type="video/webm" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- decorative poster until video hydrates
        <img
          src="/videos/walkthrough-capture-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(105deg,
              rgba(5,5,5,0.88) 0%,
              rgba(5,5,5,0.72) 34%,
              rgba(5,5,5,0.4) 62%,
              rgba(5,5,5,0.5) 100%
            ),
            linear-gradient(180deg,
              rgba(5,5,5,0.5) 0%,
              transparent 35%,
              rgba(5,5,5,0.55) 100%
            )
          `,
        }}
      />
    </div>
  );
}
