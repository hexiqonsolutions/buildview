import Link from "next/link";
import { ArrowRight, Building2, Home, Landmark } from "lucide-react";
import { DemoBanner } from "@/components/experience/demo-banner";
import { DEMO_MATTERPORT } from "@/fixtures/matterport";

const demos = [
  {
    href: "/construction",
    title: "Construction Intelligence",
    subtitle: "Completed multi-year monitoring twin",
    body: "Progression, dated scans, issues, 2023–2026 timeline, proxy comments, and scan compare — same Matterport model across captures.",
    icon: Building2,
    model: DEMO_MATTERPORT.construction,
    accent: "from-slate-900 via-slate-800 to-slate-700",
  },
  {
    href: "/interior",
    title: "Interior / Architecture",
    subtitle: "Portfolio Showcase",
    body: "Client-ready interior and architecture projects with walkthroughs, photography, and showcase home — no construction ops chrome.",
    icon: Home,
    model: DEMO_MATTERPORT.interior,
    accent: "from-stone-800 via-stone-700 to-amber-900/80",
  },
  {
    href: "/real-estate",
    title: "Real Estate",
    subtitle: "Portfolio Showcase",
    body: "Listing-style portfolio with Matterport buyer walkthroughs and media galleries for premium residences.",
    icon: Landmark,
    model: DEMO_MATTERPORT.realEstate,
    accent: "from-slate-900 via-sky-950 to-slate-800",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--bv-canvas))]">
      <DemoBanner />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/db-logo.png" alt="BuildView" className="h-10 w-auto" />
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Experience links
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            BuildView product demos
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Three public, no-login experience links that mirror the real portal UI with
            git-preloaded Matterport models. Main BuildView app is untouched.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {demos.map((demo) => {
            const Icon = demo.icon;
            return (
              <Link
                key={demo.href}
                href={demo.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`bg-linear-to-br ${demo.accent} px-5 py-8 text-white`}>
                  <Icon className="h-7 w-7 text-brand-accent" />
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    {demo.subtitle}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold">{demo.title}</h2>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="flex-1 text-sm leading-relaxed text-slate-600">{demo.body}</p>
                  <p className="mt-4 text-[11px] font-mono text-slate-400">m={demo.model}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                    Open demo
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
