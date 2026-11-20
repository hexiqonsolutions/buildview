"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareTourDialog } from "@/components/share/share-tour-dialog";
import type {
  BuyerLead,
  PropertyCardData,
  PropertyDashboardData,
} from "@/lib/portal/property-dashboard-data";
import { toWhatsAppDigits } from "@/lib/property/fields";
import { cn, formatRelativeTime } from "@/lib/utils";

/**
 * Real Estate Showcase home.
 *
 * Hierarchy (refactor-ui): buyer interest numbers first, then properties with
 * one primary action each ("Share with a buyer"), then the people to call.
 * Loop (hooked-ux): share link → buyer opens it → lead appears here → call /
 * share again. Every number is real; zero states point at the next action.
 */
export function PropertyShowcaseShell({
  data,
  firstName,
}: {
  data: PropertyDashboardData;
  firstName: string;
}) {
  const { stats, properties, recentLeads } = data;

  return (
    <div className="dashboard-page space-y-8">
      <header className="space-y-1">
        {data.clientName ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {data.clientName}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-slate-500">
          Share walkthroughs with buyers and follow up on who viewed them.
        </p>
      </header>

      <section aria-label="Buyer interest" className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">
        <Stat
          value={stats.leadsThisWeek}
          label="New buyer leads"
          hint="Last 7 days"
          emphasis
        />
        <Stat value={stats.totalLeads} label="Total buyer leads" hint="All time" />
        <Stat value={stats.activeLinks} label="Active share links" hint="Links expire after 10 days" />
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        <section aria-labelledby="properties-heading" className="space-y-4 xl:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <h2 id="properties-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Your properties
            </h2>
            {properties.length > 0 ? (
              <Link
                href="/dashboard/projects"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                View all
              </Link>
            ) : null}
          </div>
          {properties.length === 0 ? (
            <EmptyPanel
              icon={Building2}
              title="No properties yet"
              body="Your BuildView team will add your properties and walkthroughs here."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="leads-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 id="leads-heading" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Recent buyer activity
            </h2>
            {recentLeads.length > 0 ? (
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                All leads <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
          {recentLeads.length === 0 ? (
            <EmptyPanel
              icon={UsersRound}
              title="No buyer leads yet"
              body="Share a walkthrough with a buyer. When they open it, their name and number appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {recentLeads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  hint,
  emphasis = false,
}: {
  value: number;
  label: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white p-5 dark:bg-slate-900">
      <p
        className={cn(
          "font-display text-3xl font-semibold tabular-nums",
          emphasis && value > 0 ? "text-brand-accent-dark" : "text-slate-900 dark:text-white"
        )}
      >
        {new Intl.NumberFormat("en-IN").format(value)}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function PropertyCard({ property }: { property: PropertyCardData }) {
  const facts = [
    property.priceLabel,
    property.configurations.length ? property.configurations.join(", ") : null,
    property.unitsLeft != null
      ? property.unitsLeft === 0
        ? "Sold out"
        : `${new Intl.NumberFormat("en-IN").format(property.unitsLeft)} units left`
      : null,
    property.possession ? `Possession ${property.possession}` : null,
  ].filter((f): f is string => Boolean(f));
  const href = `/dashboard/projects/${property.id}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-900">
      <Link href={href} className="group relative block aspect-16/10 overflow-hidden bg-slate-100 dark:bg-slate-800" aria-label={`Open ${property.name}`}>
        {property.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
          </span>
        )}
        {property.statusLabel ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
            {property.statusLabel}
          </span>
        ) : null}
        {property.leadsThisWeek > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-brand-accent px-2.5 py-1 text-[11px] font-semibold text-slate-950 shadow-sm">
            {property.leadsThisWeek} new {property.leadsThisWeek === 1 ? "lead" : "leads"}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-slate-900 dark:text-white">
            <Link href={href} className="hover:underline">
              {property.name}
            </Link>
          </h3>
          {property.location ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {property.location}
            </p>
          ) : null}
        </div>

        {facts.length > 0 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
            {facts.map((fact, index) => (
              <li key={fact} className="flex items-center gap-3">
                {index > 0 ? <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden /> : null}
                {fact}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {property.primaryTour ? (
            <ShareTourDialog
              tourId={property.primaryTour.id}
              tourName={property.primaryTour.name}
              trigger={
                <Button size="sm" className="h-10 bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  <Send className="mr-1.5 h-4 w-4" aria-hidden />
                  Share with a buyer
                </Button>
              }
            />
          ) : (
            <p className="text-sm text-slate-500">No walkthrough to share yet</p>
          )}
          <Button asChild size="sm" variant="ghost" className="h-10 text-slate-600 dark:text-slate-300">
            <Link href={href}>
              <Eye className="mr-1.5 h-4 w-4" aria-hidden />
              View as buyer
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function LeadRow({ lead }: { lead: BuyerLead }) {
  const wa = toWhatsAppDigits(lead.phone);
  const initials = lead.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const message = encodeURIComponent(
    `Hi ${lead.name.split(/\s+/)[0]}, thanks for viewing ${lead.projectName}. Would you like to schedule a site visit?`
  );
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-hidden>
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{lead.name}</p>
        <p className="truncate text-xs text-slate-500">
          {lead.projectName} · {formatRelativeTime(lead.viewedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={`Call ${lead.name}`}
          >
            <Phone className="h-4 w-4" />
          </a>
        ) : null}
        {wa ? (
          <a
            href={`https://wa.me/${wa}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-brand-accent/15 hover:text-brand-accent-dark"
            aria-label={`WhatsApp ${lead.name}`}
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Building2;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <Icon className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{body}</p>
    </div>
  );
}
