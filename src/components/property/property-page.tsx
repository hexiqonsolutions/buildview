"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  Download,
  ExternalLink,

  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BuyerFact, BuyerProperty } from "@/lib/property/buyer-view";
import { cn } from "@/lib/utils";

/**
 * Buyer-facing property page. Renders only what the server-built buyer view
 * contains — sections and fields are already filtered by the shared display
 * rule, so nothing here prints placeholders.
 *
 * Used by the portfolio project page, the public tour share page and the
 * admin "Preview as buyer" dialog.
 */
export function PropertyPage({
  view,
  tour,
  className,
}: {
  view: BuyerProperty;
  /** Embedded 360° tour (host decides which viewer to render). */
  tour?: ReactNode;
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className={cn("space-y-10 sm:space-y-14", className)}>
      <Hero view={view} />

      {tour ? <section aria-label="360° virtual tour">{tour}</section> : null}

      {view.overview ? (
        <Section title="Overview">
          {view.overview.description ? (
            <p className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
              {view.overview.description}
            </p>
          ) : null}
          {view.overview.facts.length > 0 ? (
            <FactGrid facts={view.overview.facts} className={view.overview.description ? "mt-6" : undefined} />
          ) : null}
        </Section>
      ) : null}

      {view.units ? (
        <Section title="Unit types & floor plans">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {view.units.rows.map((unit) => {
              const rows = [
                ["Carpet area", unit.carpetArea],
                ["Built-up area", unit.builtUpArea],
                ["Price", unit.price],
              ].filter((entry): entry is [string, string] => Boolean(entry[1]));
              return (
                <article
                  key={unit.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                >
                  {unit.floorPlanUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({ url: unit.floorPlanUrl!, title: unit.configuration ?? "Floor plan" })
                      }
                      className="group relative aspect-4/3 overflow-hidden bg-slate-50 dark:bg-slate-950"
                      aria-label={`Open floor plan${unit.configuration ? ` for ${unit.configuration}` : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={unit.floorPlanUrl}
                        alt={unit.configuration ? `${unit.configuration} floor plan` : "Floor plan"}
                        className="h-full w-full object-contain p-3 transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </button>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    {unit.configuration || unit.availability ? (
                      <div className="flex items-start justify-between gap-3">
                        {unit.configuration ? (
                          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                            {unit.configuration}
                          </h3>
                        ) : null}
                        {unit.availability ? (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                              unit.availability === "Sold out"
                                ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                : "bg-brand-accent/15 text-brand-accent-dark"
                            )}
                          >
                            {unit.availability}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {rows.length > 0 ? (
                      <dl className="space-y-1.5 text-sm">
                        {rows.map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4">
                            <dt className="text-slate-500">{label}</dt>
                            <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      ) : null}

      {view.amenities ? (
        <Section title="Amenities">
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {view.amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2.5 text-[15px] text-slate-700 dark:text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent/15">
                  <Check className="h-3.5 w-3.5 text-brand-accent-dark" aria-hidden />
                </span>
                {amenity}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {view.specifications ? (
        <Section title="Specifications">
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-800">
            {view.specifications.map((spec, index) => (
              <div key={`${spec.label}-${index}`} className="bg-white p-4 dark:bg-slate-900">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{spec.label}</dt>
                <dd className="mt-1 text-[15px] text-slate-800 dark:text-slate-200">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {view.location ? (
        <Section title="Location & nearby">
          <div className={cn("grid gap-6", view.location.map && view.location.nearby.length > 0 && "lg:grid-cols-5")}>
            {view.location.map ? (
              <div className="space-y-2 lg:col-span-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <iframe
                    title={`Map of ${view.project.name}`}
                    src={osmEmbedUrl(view.location.map.lat, view.location.map.lng)}
                    className="aspect-16/10 w-full"
                    loading="lazy"
                  />
                </div>
                <a
                  href={`https://www.google.com/maps?q=${view.location.map.lat},${view.location.map.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300"
                >
                  Open in Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            ) : null}
            {view.location.nearby.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white lg:col-span-2 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {view.location.nearby.map((place, index) => (
                  <li key={`${place.name}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{place.name}</p>
                      {place.type ? <p className="text-xs text-slate-500">{place.type}</p> : null}
                    </div>
                    {place.distance ? (
                      <span className="shrink-0 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                        {place.distance}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Section>
      ) : null}

      {view.gallery ? (
        <Section title="Gallery">
          <div className="space-y-6">
            {view.gallery.videoEmbedUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
                <iframe
                  title={`${view.project.name} video`}
                  src={view.gallery.videoEmbedUrl}
                  className="aspect-video w-full"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  loading="lazy"
                />
              </div>
            ) : null}
            {view.gallery.videos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {view.gallery.videos.map((video) => (
                  <video
                    key={video.id}
                    src={video.url}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={video.title}
                    className="aspect-video w-full rounded-2xl border border-slate-200 bg-black object-cover dark:border-slate-800"
                  />
                ))}
              </div>
            ) : null}
            {view.gallery.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {view.gallery.photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLightbox({ url: photo.url, title: photo.title })}
                    className={cn(
                      "group relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900",
                      index === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"
                    )}
                    aria-label={`Open photo: ${photo.title}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            {view.gallery.videoLinkUrl ? (
              <a
                href={view.gallery.videoLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300"
              >
                Watch the property video <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        </Section>
      ) : null}

      {view.progress ? (
        <Section title="Construction progress">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            {view.progress.status || view.progress.possession ? (
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                {view.progress.status ? <Stat label="Status" value={view.progress.status} /> : null}
                {view.progress.possession ? <Stat label="Expected possession" value={view.progress.possession} /> : null}
              </div>
            ) : null}
            {view.progress.percent != null ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Overall progress</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {Math.round(view.progress.percent)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-accent"
                    style={{ width: `${Math.min(100, Math.max(0, view.progress.percent))}%` }}
                  />
                </div>
              </div>
            ) : null}
            {view.progress.updates.length > 0 ? (
              <ol className="space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
                {view.progress.updates.map((update) => (
                  <li key={update.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-brand-accent" aria-hidden />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{update.title}</p>
                    {update.date ? <p className="text-xs text-slate-500">{update.date}</p> : null}
                    {update.note ? (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{update.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </Section>
      ) : null}

      {view.cta ? <EnquiryBar view={view} /> : null}

      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-5xl border-0 bg-white p-2 sm:p-3 dark:bg-slate-950">
          <DialogTitle className="sr-only">{lightbox?.title ?? "Image"}</DialogTitle>
          {lightbox ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt={lightbox.title} className="max-h-[80dvh] w-full rounded object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Hero({ view }: { view: BuyerProperty }) {
  const { project, keyFacts } = view;
  const hasCover = Boolean(project.coverUrl);
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-3xl",
        hasCover ? "bg-slate-900 text-white" : "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      )}
    >
      {hasCover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.coverUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/10" />
        </>
      ) : null}
      <div className={cn("relative flex flex-col justify-end gap-6 p-6 sm:p-10", hasCover && "min-h-[340px] sm:min-h-[420px]")}>
        <div className="space-y-2">
          <h1
            className={cn(
              "font-display text-3xl font-semibold tracking-tight sm:text-5xl",
              !hasCover && "text-slate-900 dark:text-white"
            )}
          >
            {project.name}
          </h1>
          {project.location ? (
            <p className={cn("flex items-center gap-1.5 text-sm sm:text-base", hasCover ? "text-white/80" : "text-slate-600 dark:text-slate-400")}>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {project.location}
            </p>
          ) : null}
        </div>
        {keyFacts.length > 0 ? (
          <dl
            className={cn(
              "grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:flex sm:flex-wrap",
              hasCover ? "bg-white/15 backdrop-blur-md" : "bg-slate-200 dark:bg-slate-800"
            )}
          >
            {keyFacts.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "min-w-0 flex-1 px-4 py-3 sm:min-w-[150px]",
                  hasCover ? "bg-slate-950/30" : "bg-slate-50 dark:bg-slate-900"
                )}
              >
                <dt className={cn("text-[11px] font-semibold uppercase tracking-wider", hasCover ? "text-white/60" : "text-slate-500")}>
                  {item.label}
                </dt>
                <dd className={cn("mt-0.5 truncate text-sm font-semibold sm:text-base", !hasCover && "text-slate-900 dark:text-white")} title={item.value}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}

function EnquiryBar({ view }: { view: BuyerProperty }) {
  const cta = view.cta!;
  const message = encodeURIComponent(`Hi, I'm interested in ${view.project.name}. Please share more details.`);
  const subject = encodeURIComponent(`Enquiry: ${view.project.name}`);
  return (
    <section
      aria-label="Enquire"
      className="rounded-3xl bg-brand-primary p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8"
    >
      <div>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">Interested in {view.project.name}?</h2>
        <p className="mt-1 text-sm text-white/70">Get pricing, availability and a site visit slot.</p>
      </div>
      <div className="mt-5 flex flex-col gap-2.5 sm:mt-0 sm:flex-row sm:flex-wrap sm:justify-end">
        {cta.email || cta.phone ? (
          <a
            href={cta.email ? `mailto:${cta.email}?subject=${subject}` : `tel:${cta.phone!.replace(/[^\d+]/g, "")}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
          >
            {cta.email ? <Mail className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}
            Enquire now
          </a>
        ) : null}
        {cta.whatsappDigits ? (
          <a
            href={`https://wa.me/${cta.whatsappDigits}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-accent px-5 text-sm font-semibold text-slate-950 transition hover:bg-brand-accent-dark"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
        ) : null}
        {cta.email && cta.phone ? (
          <a
            href={`tel:${cta.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call
          </a>
        ) : null}
        {cta.brochureUrl ? (
          <a
            href={cta.brochureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" aria-hidden />
            Brochure
          </a>
        ) : null}
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FactGrid({ facts, className }: { facts: BuyerFact[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {facts.map((item) => (
        <Stat key={item.key} label={item.label} value={item.value} />
      ))}
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function osmEmbedUrl(lat: number, lng: number): string {
  const dLat = 0.008;
  const dLng = 0.012;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

