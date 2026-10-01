import { createTimelineEvent } from "@/lib/actions/timeline";

type TimelineEventInput = Parameters<typeof createTimelineEvent>[0];

export type AutoTimelineEntry = Omit<TimelineEventInput, "event_date" | "skipClientNotify"> & {
  event_date?: string | null;
};

/** Site work is logged in India time, so "today" must not roll over at UTC midnight. */
export function todayForTimeline(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Best-effort timeline entry for an upload or status change that has already been saved.
 * Never throws: a timeline failure must not fail the save that triggered it.
 */
export async function recordTimelineEntry(
  entry: AutoTimelineEntry,
  source: string
): Promise<string | undefined> {
  try {
    return await createTimelineEvent({
      ...entry,
      event_date: entry.event_date || todayForTimeline(),
      skipClientNotify: true,
    });
  } catch (err) {
    console.error(`[timeline:auto] ${source} failed:`, err);
    return undefined;
  }
}
