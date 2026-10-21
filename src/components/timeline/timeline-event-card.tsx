import Link from "next/link";
import { FileText } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { TimelinePhotoGallery } from "@/components/timeline/timeline-photo-gallery";
import { PdfPreview } from "@/components/projects/pdf-preview";
import { formatDate } from "@/lib/utils";
import type { TimelineEventWithRelations } from "@/lib/types";

interface TimelineEventCardProps {
  event: TimelineEventWithRelations & { projectName?: string };
  showProject?: boolean;
  showMatterportEmbed?: boolean;
}

function formatEventDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function TimelineEventCard({
  event,
  showProject = false,
  showMatterportEmbed = true,
}: TimelineEventCardProps) {
  const eventDateTime = formatEventDateTime(event.created_at);
  const activePhotos =
    event.timeline_photos?.filter((photo) => !photo.deleted_at) ?? [];

  return (
    <div className="portal-card rounded-xl p-5">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-primary dark:text-white">
            {event.title}
          </h3>
          {showProject && event.projectName && (
            <p className="mt-1 text-sm text-slate-500">
              <Link
                href={`/dashboard/projects/${event.project_id}`}
                className="hover:text-slate-800 hover:underline dark:hover:text-slate-200"
              >
                {event.projectName}
              </Link>
            </p>
          )}
          {event.author_name ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              by {event.author_name}
            </p>
          ) : null}
          {event.building || event.floor ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {[event.building, event.floor].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            {formatDate(event.event_date)}
          </span>
          {eventDateTime ? (
            <span className="mt-0.5 block text-xs tabular-nums text-slate-400">
              {eventDateTime}
            </span>
          ) : null}
        </div>
      </div>

      {event.progress_note && (
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Progress Notes
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {event.progress_note}
          </p>
        </div>
      )}

      {showMatterportEmbed && event.tour?.matterport_url && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Virtual Tour
          </p>
          <MatterportViewer
            url={event.tour.matterport_url}
            title={event.tour.name}
            showToolbar
          />
        </div>
      )}

      {event.report && (
        <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-primary dark:text-white">
            <FileText className="h-4 w-4 text-slate-500" />
            Linked Report: {event.report.title}
          </div>
          <PdfPreview
            reportId={event.report.id}
            fileName={event.report.file_name}
            title={event.report.title}
          />
        </div>
      )}

      {activePhotos.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Photos
          </p>
          <TimelinePhotoGallery photos={activePhotos} />
        </div>
      )}
    </div>
  );
}
