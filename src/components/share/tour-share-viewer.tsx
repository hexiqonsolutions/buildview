"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Building2, Calendar, Layers, Loader2, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recordTourShareView,
  type TourSharePublicMeta,
  type TourShareUnlocked,
} from "@/lib/actions/tour-shares";
import { siteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

function storageKey(token: string) {
  return `bv-tour-share:${token}`;
}

type StoredGate = { name: string; phone: string; email: string };

export function TourShareViewer({ meta }: { meta: TourSharePublicMeta }) {
  const [tour, setTour] = useState<TourShareUnlocked | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [booting, setBooting] = useState(true);
  const [pending, startTransition] = useTransition();

  const unlock = useCallback(
    (viewerName: string, viewerPhone: string, viewerEmail: string) => {
      startTransition(async () => {
        setError(null);
        const result = await recordTourShareView({
          token: meta.token,
          name: viewerName,
          phone: viewerPhone,
          email: viewerEmail,
        });
        if (!result.ok) {
          if (result.unavailable) setUnavailable(true);
          setError(result.error);
          setBooting(false);
          return;
        }
        try {
          sessionStorage.setItem(
            storageKey(meta.token),
            JSON.stringify({
              name: viewerName,
              phone: viewerPhone,
              email: viewerEmail,
            } satisfies StoredGate)
          );
        } catch {
          /* private mode */
        }
        setTour(result.tour);
        setBooting(false);
      });
    },
    [meta.token]
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(meta.token));
      if (raw) {
        const parsed = JSON.parse(raw) as StoredGate;
        if (parsed?.name?.trim() && parsed?.phone?.trim() && parsed?.email?.trim()) {
          setName(parsed.name);
          setPhone(parsed.phone);
          setEmail(parsed.email);
          unlock(parsed.name.trim(), parsed.phone.trim(), parsed.email.trim());
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setBooting(false);
  }, [meta.token, unlock]);

  if (unavailable) {
    return <TourShareUnavailable />;
  }

  if (booting || (pending && !tour)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
        <p className="text-sm">Opening tour…</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 px-4 py-10 sm:py-16">
        <div className="space-y-2 text-center">
          <BrandLogo href="/" size="lg" tone="default" className="mx-auto justify-center" />
          <h1 className="font-display text-2xl font-semibold text-slate-900">View this site tour</h1>
          <p className="text-sm text-slate-600">
            Enter your name, phone, and email to open the 360° walkthrough for{" "}
            <span className="font-medium text-slate-900">{meta.projectName}</span>.
          </p>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            unlock(name, phone, email);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="viewer-name">Name</Label>
            <Input
              id="viewer-name"
              name="name"
              autoComplete="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewer-phone">Phone</Label>
            <Input
              id="viewer-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewer-email">Email</Label>
            <Input
              id="viewer-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…
              </>
            ) : (
              "View tour"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Link expires {formatDate(meta.expiresAt)}. Powered by {siteConfig.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo href="/" size="md" tone="default" />
          <p className="hidden text-xs text-slate-500 sm:block">Shared site tour</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {siteConfig.name}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {tour.projectName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
            {tour.projectLocation && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {tour.projectLocation}
              </span>
            )}
            <span className="font-medium text-slate-900">{tour.tourName}</span>
            {tour.captureDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {formatDate(tour.captureDate)}
              </span>
            )}
            {tour.building && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {tour.building}
              </span>
            )}
            {tour.floor && (
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                {tour.floor}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <MatterportViewer
            url={tour.matterportUrl}
            title={tour.tourName}
            aspectRatio
            showToolbar
            className="rounded-none"
          />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <p className="text-sm text-slate-600">
            Powered by <span className="font-semibold text-slate-900">{siteConfig.name}</span>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/contact">Book a demo</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function TourShareUnavailable() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <BrandLogo href="/" size="lg" tone="default" />
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-2xl font-semibold text-slate-900">Link unavailable</h1>
        <p className="text-sm text-slate-600">
          This share link has expired or been revoked. Ask the sender for a new link.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Visit {siteConfig.name}</Link>
      </Button>
    </div>
  );
}
