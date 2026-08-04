"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ActivityType, MembershipRole } from "@prisma/client";
import {
  Phone,
  Calendar,
  Mail,
  CheckSquare,
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { deleteActivityAction } from "@/lib/activities/actions";
import type { ActivityListItem } from "@/lib/activities/queries";
import type { ActivityFilter } from "@/lib/activities/schema";
import { ACTIVITY_TYPES } from "@/lib/activities/schema";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
};

type ActivitiesWorkspaceProps = {
  role: MembershipRole;
  filter: ActivityFilter;
  items: ActivityListItem[];
  counts: Record<ActivityType | "all", number>;
  leads: LeadOption[];
};

const TYPE_META: Record<
  ActivityType,
  {
    label: string;
    icon: typeof Phone;
    badge: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
  }
> = {
  CALL: { label: "Call", icon: Phone, badge: "default" },
  MEETING: { label: "Meeting", icon: Calendar, badge: "warning" },
  EMAIL: { label: "Email", icon: Mail, badge: "outline" },
  TASK: { label: "Task", icon: CheckSquare, badge: "success" },
  NOTE: { label: "Note", icon: StickyNote, badge: "secondary" },
};

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...ACTIVITY_TYPES.map((type) => ({
    id: type as ActivityFilter,
    label: TYPE_META[type].label,
  })),
];

export function ActivitiesWorkspace({
  role,
  filter,
  items,
  counts,
  leads,
}: ActivitiesWorkspaceProps) {
  const canWrite = role !== MembershipRole.VIEWER;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityListItem | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const defaultLeadId = searchParams.get("leadId") || undefined;

  useEffect(() => {
    if (defaultLeadId) setCreateOpen(true);
  }, [defaultLeadId]);

  function setFilter(next: ActivityFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("type");
    else params.set("type", next);
    router.push(`/activities?${params.toString()}`);
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    router.push(`/activities?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
            Activities
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            {counts.all} timeline events
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Calls, meetings, emails, tasks, and notes in one feed.
          </p>
        </div>
        {canWrite ? (
          <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Log activity
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#121212] p-4 lg:flex-row lg:items-center">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or notes…"
            className="pl-10"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span className="ml-1 tabular-nums text-[11px] opacity-70">
                {counts[item.id]}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121212] px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            No activities yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Log a call or meeting, or send an email to start the timeline.
          </p>
          {canWrite ? (
            <Button
              className="mt-6 cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              Log activity
            </Button>
          ) : null}
        </div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[19px] before:w-px before:bg-zinc-800">
          {items.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="relative flex gap-4 pl-1">
                <span className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="size-4" aria-hidden />
                </span>
                <article className="min-w-0 flex-1 rounded-2xl border border-zinc-800/80 bg-[#121212] px-4 py-3 transition-colors hover:border-zinc-700">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium text-white">
                          {item.title}
                        </h3>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {format(new Date(item.occurredAt), "MMM d, yyyy · h:mm a")}{" "}
                        ·{" "}
                        {formatDistanceToNow(new Date(item.occurredAt), {
                          addSuffix: true,
                        })}
                        {item.actor
                          ? ` · ${item.actor.fullName || item.actor.email}`
                          : ""}
                      </p>
                      {item.lead ? (
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.lead.contactName} · {item.lead.company}
                        </p>
                      ) : null}
                      {item.body ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                          {item.body}
                        </p>
                      ) : null}
                    </div>

                    {canWrite && item.type !== "EMAIL" ? (
                      <div className="flex gap-2">
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
                              const result = await deleteActivityAction(item.id);
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Activity removed");
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <ActivityFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && defaultLeadId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("leadId");
            router.replace(`/activities?${params.toString()}`);
          }
        }}
        leads={leads}
        canWrite={canWrite}
        defaultLeadId={defaultLeadId}
      />
      <ActivityFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        leads={leads}
        activity={editing}
        canWrite={canWrite}
      />
    </div>
  );
}
