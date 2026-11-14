/**
 * Pure policy for when a new tour viewer should trigger staff notifications.
 * Keep in sync with scripts/test-tour-viewer-phase2.mjs.
 *
 * Notify only when a tour_share_views row was actually inserted. Do not notify
 * on session restore, dedupe reuse, or insert failure.
 */

export function shouldNotifyNewTourViewer(params: {
  viewRecorded: boolean;
}): boolean {
  return params.viewRecorded === true;
}

/** In-app / email link for authorized staff (no PII in the path). */
export const TOUR_VIEWERS_ADMIN_LINK = "/admin/tour-viewers";

/**
 * Build a minimized staff-facing message. Omits phone and email — contact
 * details stay on the protected Tour Viewers page.
 */
export function buildTourViewerNotifyCopy(params: {
  viewerName: string;
  projectName: string;
  tourName: string;
}): { title: string; message: string; link: string } {
  const viewerName = params.viewerName.trim() || "Someone";
  const projectName = params.projectName.trim() || "a project";
  const tourName = params.tourName.trim() || "a tour";
  return {
    title: "New tour viewer",
    message: `${viewerName} opened the shared tour "${tourName}" on ${projectName}. Open Tour Viewers for contact details.`,
    link: TOUR_VIEWERS_ADMIN_LINK,
  };
}
