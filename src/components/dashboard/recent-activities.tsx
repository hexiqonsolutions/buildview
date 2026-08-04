import { formatDistanceToNow } from "date-fns";
import {
  Activity as ActivityIcon,
  Mail,
  Phone,
  StickyNote,
  Calendar,
  CheckSquare,
} from "lucide-react";
import type { ActivityType } from "@prisma/client";
import type { ActivityItem } from "@/lib/dashboard/metrics";

type RecentActivitiesProps = {
  items: ActivityItem[];
};

const TYPE_ICON: Record<ActivityType, typeof Mail> = {
  CALL: Phone,
  MEETING: Calendar,
  EMAIL: Mail,
  TASK: CheckSquare,
  NOTE: StickyNote,
};

export function RecentActivities({ items }: RecentActivitiesProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
          Recent Activities
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Calls, meetings, emails, tasks, and notes
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-10 text-center">
          <ActivityIcon className="mb-3 size-5 text-zinc-600" aria-hidden />
          <p className="text-sm font-medium text-zinc-300">No activity yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Timeline updates as your team logs work on leads.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-zinc-800">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? ActivityIcon;
            return (
              <li key={item.id} className="relative flex gap-3 pl-1">
                <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <time className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                      {formatDistanceToNow(new Date(item.occurredAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">
                    {item.type}
                    {item.actorName ? ` · ${item.actorName}` : ""}
                  </p>
                  {item.leadName ? (
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.leadName}</p>
                  ) : null}
                  {item.body ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{item.body}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
