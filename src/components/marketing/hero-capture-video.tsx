/**
 * Hero media: walkthrough capture video with a dark → clear gradient (left → right).
 * Place your file at: public/videos/walkthrough-capture.mp4
 * Optional poster: public/videos/walkthrough-capture-poster.jpg
 */
export function HeroCaptureVideo() {
  return (
    <div className="surface-card overflow-hidden border-white/10 bg-slate-900/80 p-2 shadow-glow">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="How BuildView captures a Matterport walkthrough on site"
        >
          <source src="/videos/walkthrough-capture.mp4" type="video/mp4" />
          <source src="/videos/walkthrough-capture.webm" type="video/webm" />
        </video>

        {/* Dark left → clear right */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, rgba(5,5,5,0.94) 0%, rgba(5,5,5,0.72) 28%, rgba(5,5,5,0.28) 58%, rgba(5,5,5,0.06) 82%, transparent 100%)",
          }}
        />

        {/* Soft brand tint on the dark edge */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-2/5"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, rgba(164,207,48,0.12) 0%, transparent 100%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6">
          <div className="max-w-[14rem] sm:max-w-[16rem]">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand-accent">
              On-site capture
            </p>
            <p className="mt-1.5 font-display text-lg font-semibold leading-snug text-white sm:text-xl">
              How we capture the walkthrough
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300/90 sm:text-sm">
              Pro Matterport scanning from dark shell to a clear, navigable tour.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-black/45 px-3 py-2 text-xs text-slate-300 backdrop-blur-sm sm:px-4">
            <span>Capture → Process → Portal</span>
            <span className="shrink-0 font-medium text-brand-accent">Live process</span>
          </div>
        </div>
      </div>
    </div>
  );
}
