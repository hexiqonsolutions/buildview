/** Deep links for client portal notifications — open the matching Content tab. */

export function portalReportLink(projectId: string, reportId?: string): string {
  const base = `/dashboard/reports?project=${projectId}`;
  return reportId ? `${base}&report=${reportId}` : base;
}

export function portalDocumentLink(projectId: string, documentId?: string): string {
  const base = `/dashboard/documents?project=${projectId}`;
  return documentId ? `${base}&document=${documentId}` : base;
}

export function portalInvoiceLink(projectId?: string | null, invoiceId?: string): string {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (invoiceId) params.set("invoice", invoiceId);
  const qs = params.toString();
  return qs ? `/dashboard/invoices?${qs}` : "/dashboard/invoices";
}

export function portalTimelineLink(projectId: string): string {
  return `/dashboard/timeline?project=${projectId}`;
}

export function portalPhotosLink(projectId: string): string {
  return `/dashboard/projects/${projectId}?tab=photos`;
}

export function portalIssuesLink(projectId: string, issueId?: string): string {
  const base = `/dashboard/issues?project=${projectId}`;
  return issueId ? `${base}&issue=${issueId}` : base;
}

export function portalMatterportLink(projectId: string, tourId?: string): string {
  const base = `/dashboard/projects/${projectId}`;
  return tourId ? `${base}?tour=${tourId}` : base;
}

/** Clear client-facing copy: what was uploaded and for which project. */
export function formatUploadNotifyMessage(
  itemName: string,
  projectName: string,
  destination:
    | "Reports"
    | "Documents"
    | "Invoices"
    | "Timeline"
    | "Site Photos"
    | "Issues"
    | "project"
): string {
  const item = itemName.trim() || "A file";
  const project = projectName.trim() || "your project";
  if (destination === "project") {
    return `"${item}" was uploaded for ${project}.`;
  }
  return `"${item}" was uploaded for ${project}. Open ${destination} to view it.`;
}

const PROJECT_LINK_RE = /\/dashboard\/projects\/([0-9a-f-]{36})(?:\?[^#]*)?/i;

function adminContentLink(portalHref: string): string {
  if (portalHref.startsWith("/dashboard/reports")) {
    return portalHref.replace("/dashboard/reports", "/admin/reports");
  }
  if (portalHref.startsWith("/dashboard/documents")) {
    return portalHref.replace("/dashboard/documents", "/admin/documents");
  }
  if (portalHref.startsWith("/dashboard/invoices")) {
    return portalHref.replace("/dashboard/invoices", "/admin/invoices");
  }
  if (portalHref.startsWith("/dashboard/timeline")) {
    return portalHref.replace("/dashboard/timeline", "/admin/timeline");
  }
  if (portalHref.startsWith("/dashboard/issues")) {
    return portalHref.replace("/dashboard/issues", "/admin/issues");
  }
  if (portalHref.startsWith("/dashboard/projects/")) {
    return portalHref.replace("/dashboard/projects/", "/admin/projects/");
  }
  if (portalHref.startsWith("/dashboard/matterport-comparison")) {
    return "/admin/tours";
  }
  return portalHref;
}

function isContentTabLink(href: string): boolean {
  return (
    href.startsWith("/dashboard/reports") ||
    href.startsWith("/dashboard/documents") ||
    href.startsWith("/dashboard/invoices") ||
    href.startsWith("/dashboard/timeline") ||
    href.startsWith("/dashboard/issues") ||
    href.startsWith("/dashboard/matterport") ||
    href.startsWith("/admin/reports") ||
    href.startsWith("/admin/documents") ||
    href.startsWith("/admin/invoices") ||
    href.startsWith("/admin/timeline") ||
    href.startsWith("/admin/issues") ||
    href.startsWith("/admin/tours")
  );
}

/**
 * Resolve a notification href to the correct Reports / Documents / Invoices / etc. tab.
 * Rewrites legacy `/dashboard/projects/{id}` links using title/message/type so older
 * inbox items still open the right place.
 */
export function resolveNotificationHref(
  link: string | null | undefined,
  meta: { title?: string | null; message?: string | null; type?: string | null },
  options?: { preferAdmin?: boolean }
): string | null {
  if (!link) return null;

  let href = link;
  const title = (meta.title ?? "").toLowerCase();
  const message = (meta.message ?? "").toLowerCase();
  const haystack = `${title} ${message}`;
  const projectMatch = href.match(PROJECT_LINK_RE);
  const projectId = projectMatch?.[1];

  // Legacy project-overview links → content tabs (title takes priority).
  if (projectId && !isContentTabLink(href)) {
    if (
      /document uploaded|new document/.test(title) ||
      /available in (your )?project documents|open documents/.test(haystack) ||
      (/document|drawing|contract|\bboq\b/.test(haystack) && !/report/.test(title))
    ) {
      href = portalDocumentLink(projectId);
    } else if (
      /report uploaded|new report/.test(title) ||
      /available in reports|open reports/.test(haystack) ||
      /\breport\b/.test(haystack)
    ) {
      href = portalReportLink(projectId);
    } else if (
      meta.type === "invoice_update" ||
      /invoice/.test(haystack)
    ) {
      href = portalInvoiceLink(projectId);
    } else if (/site photo|new site photos|site images/.test(haystack)) {
      href = portalPhotosLink(projectId);
    } else if (
      /[?&]tab=timeline/i.test(link) ||
      /timeline updated/.test(haystack)
    ) {
      href = portalTimelineLink(projectId);
    } else if (
      /[?&]tab=issues/i.test(link) ||
      meta.type === "issue_update" ||
      /\bissue\b/.test(haystack)
    ) {
      href = portalIssuesLink(projectId);
    } else if (/matterport|scan/.test(haystack)) {
      href = portalMatterportLink(projectId);
    }
  }

  if (options?.preferAdmin) {
    href = adminContentLink(href);
  }

  return href;
}
