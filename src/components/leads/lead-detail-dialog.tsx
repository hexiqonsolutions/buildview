"use client";

import Link from "next/link";
import { format } from "date-fns";
import { LeadPriority, LeadStatus } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRIORITY_BADGE,
  STATUS_BADGE,
  labelize,
} from "@/lib/leads/constants";
import type { LeadListItem } from "@/lib/leads/queries";

type LeadDetailDialogProps = {
  lead: LeadListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: LeadListItem) => void;
  canWrite: boolean;
};

function money(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onEdit,
  canWrite,
}: LeadDetailDialogProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead.company}</DialogTitle>
          <DialogDescription>
            {lead.contactName}
            {lead.designation ? ` · ${lead.designation}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_BADGE[lead.status as LeadStatus]}>
            {labelize(lead.status)}
          </Badge>
          <Badge variant={PRIORITY_BADGE[lead.priority as LeadPriority]}>
            {labelize(lead.priority)}
          </Badge>
          {lead.tags.map((tag) => (
            <Badge key={tag.id} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Meta label="Email" value={lead.email} />
          <Meta label="Phone" value={lead.phone} />
          <Meta label="WhatsApp" value={lead.whatsapp} />
          <Meta label="LinkedIn" value={lead.linkedin} />
          <Meta label="Website" value={lead.website} />
          <Meta label="Industry" value={lead.industry} />
          <Meta label="Location" value={lead.location} />
          <Meta label="Source" value={lead.leadSource} />
          <Meta label="Project type" value={lead.projectType} />
          <Meta label="Budget" value={money(lead.budget)} />
          <Meta label="Expected revenue" value={money(lead.expectedRevenue)} />
          <Meta
            label="Owner"
            value={lead.owner?.fullName || lead.owner?.email || "—"}
          />
          <Meta
            label="Next follow-up"
            value={
              lead.nextFollowUpAt
                ? format(new Date(lead.nextFollowUpAt), "MMM d, yyyy")
                : "—"
            }
          />
          <Meta
            label="Last contacted"
            value={
              lead.lastContactedAt
                ? format(new Date(lead.lastContactedAt), "MMM d, yyyy")
                : "—"
            }
          />
          <Meta label="Documents" value={String(lead.documentCount)} />
        </div>

        {lead.notes ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              Notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
              {lead.notes}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canWrite ? (
            <>
              <Button asChild variant="outline" className="cursor-pointer">
                <Link href={`/follow-ups?leadId=${lead.id}&bucket=today`}>
                  Schedule follow-up
                </Link>
              </Button>
              <Button asChild variant="outline" className="cursor-pointer">
                <Link href={`/activities?leadId=${lead.id}`}>
                  Log activity
                </Link>
              </Button>
              <Button asChild variant="outline" className="cursor-pointer">
                <Link href={`/documents?leadId=${lead.id}`}>
                  Upload document
                </Link>
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(lead);
                }}
              >
                Edit lead
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm text-zinc-200">{value || "—"}</p>
    </div>
  );
}
