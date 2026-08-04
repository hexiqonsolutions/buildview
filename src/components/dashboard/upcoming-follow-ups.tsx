import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, Clock3, SunMedium } from "lucide-react";
import type { FollowUpItem } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils";

type UpcomingFollowUpsProps = {
  items: FollowUpItem[];
};

const BUCKET_META = {
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className: "text-red-300 border-red-500/30 bg-red-500/10",
  },
  today: {
    label: "Due today",
    icon: SunMedium,
    className: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock3,
    className: "text-zinc-300 border-zinc-700 bg-zinc-900/80",
  },
} as const;

export function UpcomingFollowUps({ items }: UpcomingFollowUpsProps) {
  const ordered = [
    ...items.filter((i) => i.bucket === "overdue"),
    ...items.filter((i) => i.bucket === "today"),
    ...items.filter((i) => i.bucket === "upcoming"),
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Upcoming Tasks
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Follow-ups grouped by overdue, today, and upcoming
        </p>
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-10 text-center">
          <p className="text-sm font-medium text-zinc-300">No follow-ups scheduled</p>
          <p className="mt-1 text-sm text-zinc-500">
            Reminders appear here once leads have next steps.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 overflow-y-auto">
          {ordered.map((item) => {
            const meta = BUCKET_META[item.bucket];
            const Icon = meta.icon;
            return (
              <li
                key={item.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 transition-colors duration-200 hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    {item.leadName ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{item.leadName}</p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      meta.className
                    )}
                  >
                    <Icon className="size-3" aria-hidden />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-2 text-xs tabular-nums text-zinc-500">
                  {format(new Date(item.dueAt), "MMM d, yyyy · h:mm a")} ·{" "}
                  {formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
