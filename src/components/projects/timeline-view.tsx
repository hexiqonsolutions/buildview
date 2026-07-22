import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TimelineEventCard } from "@/components/timeline/timeline-event-card";
import type { TimelineEventWithRelations } from "@/lib/types";

export function TimelineView({
  events,
  showProject = false,
}: {
  events: TimelineEventWithRelations[];
  showProject?: boolean;
}) {
  const sortedEvents = [...events].sort((a, b) => {
    const dateDiff =
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.sort_order - b.sort_order;
  });

  if (sortedEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No timeline events yet."
        description="Progress milestones, photos, and notes will appear here as the project advances."
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-brand-accent/30" />
      <div className="space-y-8">
        {sortedEvents.map((event) => (
          <div key={event.id} className="relative pl-14">
            <div className="absolute left-4 top-1 h-4 w-4 rounded-full border-4 border-white bg-brand-accent dark:border-slate-900" />
            <TimelineEventCard
              event={event}
              showProject={showProject}
              showMatterportEmbed
            />
          </div>
        ))}
      </div>
    </div>
  );
}
