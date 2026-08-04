"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Plus,
  Pencil,
  Trash2,
  SunMedium,
} from "lucide-react";
import { toast } from "sonner";
import { MembershipRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FollowUpFormDialog } from "@/components/follow-ups/follow-up-form-dialog";
import {
  deleteFollowUpAction,
  setFollowUpStatusAction,
} from "@/lib/follow-ups/actions";
import type { FollowUpListItem } from "@/lib/follow-ups/queries";
import type { FollowUpBucket } from "@/lib/follow-ups/schema";
import { cn } from "@/lib/utils";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
  email: string | null;
};

type FollowUpsWorkspaceProps = {
  role: MembershipRole;
  bucket: FollowUpBucket;
  items: FollowUpListItem[];
  counts: { today: number; upcoming: number; overdue: number };
  leads: LeadOption[];
};

const TABS: { id: FollowUpBucket; label: string }[] = [
  { id: "today", label: "Due today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "all", label: "All pending" },
  { id: "done", label: "Done" },
];

export function FollowUpsWorkspace({
  role,
  bucket,
  items,
  counts,
  leads,
}: FollowUpsWorkspaceProps) {
  const canWrite = role !== MembershipRole.VIEWER;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpListItem | null>(null);

  const defaultLeadId = searchParams.get("leadId") || undefined;

  useEffect(() => {
    if (defaultLeadId) setCreateOpen(true);
  }, [defaultLeadId]);

  const kpis = useMemo(
    () => [
      {
        label: "Due today",
        value: counts.today,
        tone: "text-amber-300",
        icon: SunMedium,
      },
      {
        label: "Upcoming",
        value: counts.upcoming,
        tone: "text-zinc-300",
        icon: Clock3,
      },
      {
        label: "Overdue",
        value: counts.overdue,
        tone: "text-red-300",
        icon: AlertCircle,
      },
    ],
    [counts]
  );

  function setBucket(next: FollowUpBucket) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bucket", next);
    router.push(`/follow-ups?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
            Follow-ups
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            Stay on every bid conversation
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Manual reminders with automatic due/overdue notifications.
          </p>
        </div>
        {canWrite ? (
          <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add follow-up
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {kpi.label}
                </p>
                <Icon className={cn("size-4", kpi.tone)} />
              </div>
              <p
                className={cn(
                  "mt-3 font-[family-name:var(--font-display)] text-3xl tabular-nums",
                  kpi.tone
                )}
              >
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={bucket === tab.id ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setBucket(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121212] px-6 py-14 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-white">
              No follow-ups here
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Create a reminder for a lead call, site visit, or proposal review.
            </p>
            {canWrite ? (
              <Button
                className="mt-6 cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                Add follow-up
              </Button>
            ) : null}
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800/80 bg-[#121212] px-4 py-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-medium text-white">
                      {item.title}
                    </h3>
                    <Badge
                      variant={
                        item.bucket === "overdue"
                          ? "danger"
                          : item.bucket === "today"
                            ? "warning"
                            : item.bucket === "done"
                              ? "success"
                              : "secondary"
                      }
                    >
                      {item.bucket}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {item.lead.contactName} · {item.lead.company}
                  </p>
                  <p className="mt-2 text-xs tabular-nums text-zinc-500">
                    Due {format(new Date(item.dueAt), "MMM d, yyyy · h:mm a")} ·{" "}
                    {formatDistanceToNow(new Date(item.dueAt), {
                      addSuffix: true,
                    })}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                      {item.notes}
                    </p>
                  ) : null}
                </div>

                {canWrite && item.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await setFollowUpStatusAction({
                            id: item.id,
                            status: "DONE",
                          });
                          if (!result.ok) toast.error(result.error);
                          else toast.success("Marked complete");
                        })
                      }
                    >
                      <CheckCircle2 className="size-4" />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setEditing(item)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteFollowUpAction(item.id);
                          if (!result.ok) toast.error(result.error);
                          else toast.success("Follow-up removed");
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <FollowUpFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && defaultLeadId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("leadId");
            router.replace(`/follow-ups?${params.toString()}`);
          }
        }}
        leads={leads}
        canWrite={canWrite}
        defaultLeadId={defaultLeadId}
      />
      <FollowUpFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        leads={leads}
        followUp={editing}
        canWrite={canWrite}
      />
    </div>
  );
}
