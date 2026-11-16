"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import {
  LIVE_WALKTHROUGH_VIDEOS,
  liveWalkthroughTabs,
} from "@/lib/marketing/home-content";
import { cn } from "@/lib/utils";

type TabId = (typeof liveWalkthroughTabs)[number]["id"];

export function HomeLiveWalkthrough() {
  const [active, setActive] = useState<TabId>("site");
  const videoRef = useRef<HTMLVideoElement>(null);
  const tab = liveWalkthroughTabs.find((item) => item.id === active) ?? liveWalkthroughTabs[0];
  const videoSrc = LIVE_WALKTHROUGH_VIDEOS[active];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    video.pause();
    video.load();
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay may be blocked until the user interacts; controls remain available.
      });
    }
  }, [active, videoSrc]);

  return (
    <div className="mx-auto max-w-5xl">
      <div
        role="tablist"
        aria-label="Sample walkthrough types"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"
      >
        {liveWalkthroughTabs.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`walkthrough-tab-${item.id}`}
              aria-controls="walkthrough-panel"
              onClick={() => setActive(item.id)}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                selected
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id="walkthrough-panel"
        role="tabpanel"
        aria-labelledby={`walkthrough-tab-${tab.id}`}
        className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-soft dark:border-slate-800"
      >
        <div className="relative aspect-video w-full bg-slate-900">
          {videoSrc ? (
            <video
              key={active}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              controls
              playsInline
              muted
              loop
              preload="metadata"
              aria-label={`${tab.label} sample walkthrough video`}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-linear-to-br from-slate-900 via-slate-950 to-black px-6 text-center">
              <p className="font-display text-xl font-semibold text-white md:text-2xl">
                Sample coming soon
              </p>
              <p className="max-w-md text-sm text-slate-400">{tab.caption}</p>
              <Button variant="accent" size="lg" className="shadow-glow" asChild>
                <TrackedLink
                  href="/contact?interest=demo"
                  eventLabel={`home_walkthrough_placeholder_${tab.id}`}
                >
                  Book a Demo <ArrowRight className="h-4 w-4" />
                </TrackedLink>
              </Button>
            </div>
          )}
        </div>
        <p className="border-t border-white/10 px-5 py-4 text-sm text-slate-300">
          {tab.caption}
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="accent" size="lg" className="shadow-soft" asChild>
          <TrackedLink
            href="/contact?interest=demo"
            eventLabel="home_walkthrough_get_this"
          >
            Get this for your own project <ArrowRight className="h-4 w-4" />
          </TrackedLink>
        </Button>
      </div>
    </div>
  );
}
