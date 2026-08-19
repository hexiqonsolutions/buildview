import { Metadata } from "next";
import {
  ArrowRight,
  Camera,
  ClipboardList,
  Compass,
  LayoutDashboard,
  Mail,
  PlayCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { InstagramFollow } from "@/components/marketing/instagram-follow";
import { ViewContentTracker } from "@/components/analytics/view-content-tracker";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { utmCampaigns, withUtm } from "@/lib/utm";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "Book a BuildView Demo",
  description:
    "See how BuildView monitors construction projects with 360° site tours, progress reports, documents, timelines and issue tracking.",
  path: "/links",
});

const destinationLinks = [
  {
    label: "Book a Demo",
    description: "Schedule a live walkthrough of the construction monitoring platform.",
    href: withUtm("/contact", utmCampaigns.instagramBio, "book_demo"),
    icon: ClipboardList,
    primary: true,
  },
  {
    label: "Explore BuildView",
    description: "See the platform modules used for remote project visibility.",
    href: withUtm("/services", utmCampaigns.instagramBio, "explore_platform"),
    icon: LayoutDashboard,
    primary: false,
  },
  {
    label: "How it works",
    description: "Capture, monitor, review, and keep stakeholders aligned.",
    href: withUtm("/#platform", utmCampaigns.instagramBio, "how_it_works"),
    icon: PlayCircle,
    primary: false,
  },
  {
    label: "360° Virtual Site Tours",
    description: "Walk a construction site remotely from an immersive visual record.",
    href: withUtm("/services#virtual-tours", utmCampaigns.instagramBio, "virtual_tours"),
    icon: Camera,
    primary: false,
  },
  {
    label: "Construction Progress Monitoring",
    description: "Reports, timelines, documents, and issues in one workspace.",
    href: withUtm("/services#reports", utmCampaigns.instagramBio, "progress_monitoring"),
    icon: Compass,
    primary: false,
  },
  {
    label: "Contact BuildView",
    description: "Talk about a project, portfolio, or monitoring rollout.",
    href: withUtm("/contact", utmCampaigns.instagramBio, "contact"),
    icon: Mail,
    primary: false,
  },
] as const;

export default function InstagramLinksPage() {
  return (
    <div className="bg-brand-primary text-white">
      <ViewContentTracker contentName="instagram_landing" contentCategory="social" />
      <section className="site-container flex min-h-svh flex-col py-12 lg:py-16">
        <div className="mx-auto w-full max-w-xl">
          <BrandLogo href="/" size="lg" tone="onDark" className="max-w-[10rem]" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            {siteConfig.tagline}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {siteConfig.socialProofLine}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
            Construction visibility through 360° site capture, progress tracking, documentation,
            reports, and issue management.
          </p>

          <ul className="mt-10 space-y-3">
            {destinationLinks.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <TrackedLink
                    href={item.href}
                    eventLabel={`instagram_links_${item.primary ? "book_demo" : item.label}`}
                    className={cn(
                      "group flex items-start gap-4 rounded-2xl border px-5 py-4 transition-colors",
                      item.primary
                        ? "border-brand-accent/40 bg-brand-accent text-brand-primary shadow-glow hover:brightness-95"
                        : "border-white/10 bg-white/5 hover:border-brand-accent/40 hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        item.primary ? "bg-brand-primary/10" : "bg-white/5"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display text-base font-semibold">{item.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-sm leading-relaxed",
                          item.primary ? "text-brand-primary/80" : "text-slate-400"
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </TrackedLink>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 border-t border-white/10 pt-6">
            <InstagramFollow tone="dark" />
            <p className="mt-3 text-xs text-slate-500">
              Primary next step: book a demo. Instagram is for construction-tech updates, not the
              product itself.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
