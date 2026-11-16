import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { FaqSection } from "@/components/marketing/faq-section";
import { HeroCaptureVideo } from "@/components/marketing/hero-capture-video";
import { HomeLiveWalkthrough } from "@/components/marketing/home-live-walkthrough";
import { ProcessTimeline } from "@/components/marketing/process-timeline";
import { Section } from "@/components/marketing/section";
import { SectionHeader } from "@/components/marketing/section-header";
import { SolutionCard } from "@/components/marketing/solution-card";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/analytics/tracked-link";
import {
  FREE_SAMPLE_OFFER,
  SHOW_PROOF,
  getVisibleHomeFaqs,
  homeSolutionCards,
  howItWorksSteps,
  problemCards,
  progressSteps,
  proofStripPlaceholders,
  whyBuildViewItems,
} from "@/lib/marketing/home-content";
import { pageMetadata } from "@/lib/seo";
import { getWhatsAppUrl } from "@/lib/site-config";

const HOME_TITLE =
  "BuildView | 360° Walkthroughs for Construction, Real Estate & Interiors";
const HOME_DESCRIPTION =
  "Show sites, flats and finished interiors as 360° walkthroughs. Track construction progress, sell properties faster and win design clients. Book a demo.";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "360° Walkthroughs for Construction, Real Estate & Interiors",
    description: HOME_DESCRIPTION,
    path: "/",
  }),
  title: {
    absolute: HOME_TITLE,
  },
  openGraph: {
    ...pageMetadata({
      title: "360° Walkthroughs for Construction, Real Estate & Interiors",
      description: HOME_DESCRIPTION,
      path: "/",
    }).openGraph,
    title: HOME_TITLE,
  },
  twitter: {
    ...pageMetadata({
      title: "360° Walkthroughs for Construction, Real Estate & Interiors",
      description: HOME_DESCRIPTION,
      path: "/",
    }).twitter,
    title: HOME_TITLE,
  },
  keywords: [
    "360 virtual walkthroughs",
    "construction progress tracking",
    "real estate virtual tours",
    "interior design walkthroughs",
    "BuildView",
  ],
};

const visibleFaqs = getVisibleHomeFaqs();

const faqJsonLd =
  visibleFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: visibleFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

export default function HomePage() {
  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      {/* SECTION 1: Hero */}
      <section className="relative -mt-18 min-h-svh overflow-hidden text-white lg:-mt-20">
        <HeroCaptureVideo />

        <div className="site-container relative z-10 flex min-h-svh flex-col justify-center pb-24 pt-28 lg:pb-28 lg:pt-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white motion-safe:animate-hero-rise md:text-5xl lg:text-6xl lg:leading-[1.05]">
              Don&apos;t imagine it. Walk it.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-100 motion-safe:animate-hero-rise md:text-xl [animation-delay:80ms]">
              BuildView turns construction sites, ready flats and finished interiors into 360°
              walkthroughs, so you can show the real thing instead of explaining it.
            </p>
            <div className="mt-9 flex flex-col gap-3 motion-safe:animate-hero-rise sm:flex-row sm:items-center [animation-delay:160ms]">
              <Button
                variant="accent"
                size="lg"
                className="shadow-glow text-brand-primary hover:text-brand-primary"
                asChild
              >
                <TrackedLink href="#live-walkthrough" eventLabel="home_hero_live_walkthrough">
                  Try a Live Walkthrough <ArrowRight className="h-5 w-5" />
                </TrackedLink>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/55 hover:bg-white/15 hover:text-white"
                asChild
              >
                <TrackedLink href="/contact?interest=demo" eventLabel="home_hero_book_demo">
                  Book a Demo
                </TrackedLink>
              </Button>
            </div>
            <p className="mt-6 text-sm text-slate-200 motion-safe:animate-hero-rise [animation-delay:240ms]">
              Built for builders, real estate teams, architects and interior designers.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent motion-safe:animate-hero-rise [animation-delay:280ms]">
              Proof, not promises.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Live sample walkthrough */}
      <Section id="live-walkthrough" variant="muted">
        <SectionHeader
          title="Step inside. No form, no wait."
          description="Pick a space and walk through it, just as your clients will."
        />
        <HomeLiveWalkthrough />
      </Section>

      {/* SECTION 3: Problem band */}
      <Section>
        <SectionHeader title="Sound familiar?" />
        <div className="grid gap-5 md:grid-cols-3">
          {problemCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950"
            >
              <h3 className="font-display text-lg font-semibold text-brand-primary dark:text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {card.body}
              </p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-3xl text-center font-display text-2xl font-bold tracking-tight text-brand-primary dark:text-white md:text-3xl lg:text-4xl">
          BuildView replaces explaining with showing.
        </p>
      </Section>

      {/* SECTION 4: Solution cards */}
      <Section id="solutions" variant="muted">
        <SectionHeader
          eyebrow="Solutions"
          title="Built for Construction, Real Estate & Interiors."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {homeSolutionCards.map((solution, index) => (
            <SolutionCard key={solution.slug} solution={solution} index={index} />
          ))}
        </div>
      </Section>

      {/* SECTION 5: Progress tracking */}
      <Section>
        <SectionHeader
          title="Not just a tour. A system your whole team works in."
          description="One channel for timelines, site updates and verified visual proof, with no chasing."
        />
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <ProcessTimeline steps={progressSteps} />
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {/* Optional dashboard screenshot slot — using existing marketing asset when present */}
            <div className="relative aspect-[4/3]">
              <Image
                src="/marketing/services/dashboard.jpg"
                alt="BuildView project dashboard with progress timelines and site documentation"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center font-display text-xl font-semibold text-brand-primary dark:text-white md:text-2xl">
          Everyone sees the same truth, without a single call.
        </p>
      </Section>

      {/* SECTION 6: How it works */}
      <Section variant="muted">
        <SectionHeader title="From physical space to shareable walkthrough in four steps." />
        <ProcessTimeline steps={howItWorksSteps} />
      </Section>

      {/* SECTION 7: Why BuildView */}
      <Section>
        <SectionHeader title="Stop explaining. Start showing." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {whyBuildViewItems.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent/15">
                <Check className="h-4 w-4 text-brand-accent-dark" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-brand-primary dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* SECTION 8: Proof strip — hidden until SHOW_PROOF */}
      {SHOW_PROOF ? (
        <Section variant="muted">
          <SectionHeader title="Proof, not promises." />
          {/*
            [TODO: add 2–3 client logos or names]
            [TODO: add three numbers — projects scanned, sq ft captured, walkthroughs shared]
            [TODO: add one testimonial with name, role and company]
          */}
          <div className="space-y-10">
            {proofStripPlaceholders.logos.length > 0 ? (
              <ul className="flex flex-wrap items-center justify-center gap-6">
                {proofStripPlaceholders.logos.map((logo) => (
                  <li
                    key={logo.name}
                    className="text-sm font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {logo.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {proofStripPlaceholders.stats.length > 0 ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                {proofStripPlaceholders.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {stat.label}
                    </dt>
                    <dd className="mt-2 font-display text-3xl font-bold text-brand-primary dark:text-white">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {proofStripPlaceholders.testimonial ? (
              <blockquote className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-950">
                <p className="font-display text-xl text-brand-primary dark:text-white">
                  “{proofStripPlaceholders.testimonial.quote}”
                </p>
                <footer className="mt-4 text-sm text-slate-500">
                  {proofStripPlaceholders.testimonial.name},{" "}
                  {proofStripPlaceholders.testimonial.role},{" "}
                  {proofStripPlaceholders.testimonial.company}
                </footer>
              </blockquote>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* SECTION 9: FAQ */}
      {visibleFaqs.length > 0 ? (
        <Section variant={SHOW_PROOF ? "default" : "muted"}>
          <SectionHeader
            eyebrow="FAQ"
            title="Questions teams ask before they start."
          />
          <FaqSection items={visibleFaqs} />
        </Section>
      ) : null}

      {/* SECTION 10: Final CTA */}
      <Section variant="accent" className="relative overflow-hidden">
        <div className="dot-pattern absolute inset-0 opacity-25" />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(164,207,48,0.14), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">
            See your space the way your clients will.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            {FREE_SAMPLE_OFFER
              ? "Tell us about one flat, floor or project, and we'll show you how it looks in BuildView."
              : "Tell us about your project and we'll show you how BuildView works for it."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="accent" size="lg" className="shadow-glow" asChild>
              <TrackedLink
                href="/contact?interest=demo"
                eventLabel={
                  FREE_SAMPLE_OFFER ? "home_final_free_sample" : "home_final_book_demo"
                }
              >
                {FREE_SAMPLE_OFFER ? "Get a Free Sample Walkthrough" : "Book a Demo"}
              </TrackedLink>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <a
                href={getWhatsAppUrl(
                  "Hi BuildView, I'd like to chat about a project walkthrough."
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat on WhatsApp
              </a>
            </Button>
          </div>
          <p className="mt-5">
            <Link
              href="/contact?interest=demo"
              className="text-sm font-medium text-brand-accent underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              Book a Demo
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
