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

export function TimelineEventCard({
  event,
  showProject = false,
  showMatterportEmbed = true,
}: TimelineEventCardProps) {
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
                className="hover:text-brand-accent hover:underline"
              >
                {event.projectName}
              </Link>
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-brand-accent">
          {formatDate(event.event_date)}
        </span>
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
            Matterport Tour
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
            <FileText className="h-4 w-4 text-brand-accent" />
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
