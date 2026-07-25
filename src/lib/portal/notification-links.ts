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

export function portalIssuesLink(projectId: string, issueId?: string): string {
  const base = `/dashboard/issues?project=${projectId}`;
  return issueId ? `${base}&issue=${issueId}` : base;
}

export function portalMatterportLink(projectId: string, tourId?: string): string {
  const base = `/dashboard/projects/${projectId}`;
  return tourId ? `${base}?tour=${tourId}` : base;
}
