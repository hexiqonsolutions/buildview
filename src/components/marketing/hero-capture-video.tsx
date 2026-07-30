import { cn } from "@/lib/utils";

/**
 * Full-bleed hero media plane.
 * Place capture video at: public/videos/walkthrough-capture.mp4
 * Optional poster: public/videos/walkthrough-capture-poster.jpg
 */
export function HeroCaptureVideo({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-brand-primary", className)} aria-hidden>
      {/* Atmospheric base — visible if video is missing */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="dot-pattern absolute inset-0 opacity-30" />

      <video
        className="absolute inset-0 z-[1] h-full w-full scale-105 object-cover motion-safe:animate-hero-ken"
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

      {/* Readability scrim — left-weighted, no badges or overlay chrome */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: `
            linear-gradient(105deg,
              rgba(5,5,5,0.92) 0%,
              rgba(5,5,5,0.78) 32%,
              rgba(5,5,5,0.45) 58%,
              rgba(5,5,5,0.55) 100%
            ),
            linear-gradient(180deg,
              rgba(5,5,5,0.55) 0%,
              transparent 28%,
              transparent 62%,
              rgba(5,5,5,0.75) 100%
            )
          `,
        }}
      />

      {/* Soft brand accent wash */}
      <div
        className="absolute inset-0 z-[2] opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 45% at 18% 55%, rgba(164,207,48,0.16), transparent 70%)",
        }}
      />
    </div>
  );
}
