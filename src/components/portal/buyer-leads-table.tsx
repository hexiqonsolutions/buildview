"use client";

import { useMemo, useState } from "react";
import { Download, Mail, MessageCircle, Phone, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BuyerLead } from "@/lib/portal/property-dashboard-data";
import { toWhatsAppDigits } from "@/lib/property/fields";
import { formatRelativeTime } from "@/lib/utils";

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

function csvCell(value: string | null): string {
  const text = value ?? "";
  // Neutralise spreadsheet formulas and quote everything.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(leads: BuyerLead[]) {
  const header = ["Name", "Phone", "Email", "Property", "Walkthrough", "Viewed at"];
  const rows = leads.map((l) =>
    [l.name, l.phone, l.email, l.projectName, l.tourName, new Date(l.viewedAt).toISOString()]
      .map(csvCell)
      .join(",")
  );
  const blob = new Blob([[header.map(csvCell).join(","), ...rows].join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buyer-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function BuyerLeadsTable({
  leads,
  properties,
}: {
  leads: BuyerLead[];
  properties: { id: string; name: string }[];
}) {
  const [propertyId, setPropertyId] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (lead) =>
        (propertyId === "all" || lead.projectId === propertyId) &&
        (!q ||
          lead.name.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.phone?.replace(/\s/g, "").includes(q.replace(/\s/g, "")))
    );
  }, [leads, propertyId, query]);

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
        <UsersRound className="mx-auto h-6 w-6 text-slate-400" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">No buyer leads yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Open a property and use “Share with a buyer”. When someone opens the link, their name and
          number appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or email"
            aria-label="Search leads"
            className="pl-9"
          />
        </div>
        {properties.length > 1 ? (
          <select
            className={selectClass}
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            aria-label="Filter by property"
          >
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
        <Button variant="outline" className="h-10" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </div>

      <p className="text-sm text-slate-500" aria-live="polite">
        {filtered.length === leads.length
          ? `${leads.length} ${leads.length === 1 ? "lead" : "leads"}`
          : `${filtered.length} of ${leads.length} leads`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
          No leads match your search.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-header-group dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th scope="col" className="px-4 py-3">Buyer</th>
                <th scope="col" className="px-4 py-3">Property</th>
                <th scope="col" className="px-4 py-3">Viewed</th>
                <th scope="col" className="px-4 py-3 text-right">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((lead) => {
                const wa = toWhatsAppDigits(lead.phone);
                const message = encodeURIComponent(
                  `Hi ${lead.name.split(/\s+/)[0]}, thanks for viewing ${lead.projectName}. Would you like to schedule a site visit?`
                );
                return (
                  <tr key={lead.id} className="flex flex-col gap-1 px-4 py-3 md:table-row md:p-0">
                    <td className="md:px-4 md:py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{lead.name}</p>
                      <p className="text-xs text-slate-500">
                        {[lead.phone, lead.email].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="text-slate-700 md:px-4 md:py-3 dark:text-slate-300">
                      {lead.projectName}
                      {lead.tourName ? <span className="block text-xs text-slate-500">{lead.tourName}</span> : null}
                    </td>
                    <td className="text-xs text-slate-500 md:px-4 md:py-3 md:text-sm" title={dateFormat.format(new Date(lead.viewedAt))}>
                      {formatRelativeTime(lead.viewedAt)}
                    </td>
                    <td className="md:px-4 md:py-3">
                      <div className="flex gap-1 md:justify-end">
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
                        {lead.email ? (
                          <a
                            href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.projectName)}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`Email ${lead.name}`}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
