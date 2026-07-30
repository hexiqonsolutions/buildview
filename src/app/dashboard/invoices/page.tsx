import { redirect } from "next/navigation";
import {
  getPortalScopedInvoices,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { firstSearchParam } from "@/lib/portal/search-params";
import { HighlightAnchor } from "@/components/portal/highlight-anchor";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { Badge } from "@/components/ui/badge";
import { ReceiptIndianRupee } from "lucide-react";
import { formatDate, formatStatus, getStatusColor, formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/actions/auth";
import { canViewClientInvoices } from "@/lib/auth/permissions";
import { InvoiceDownloadButton } from "@/components/invoices/invoice-download-button";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || !canViewClientInvoices(user.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);
  const invoices = await getPortalScopedInvoices(scope);
  const highlightInvoiceId = firstSearchParam(params.invoice);

  return (
    <IntelPage
      title="Invoices"
      description="View and download your billing records."
      icon={ReceiptIndianRupee}
      eyebrow="Billing"
    >
      <div className="space-y-6">
        {invoices.length === 0 ? (
          <EmptyState
            icon={ReceiptIndianRupee}
            title="No invoices in this workspace"
            description="Adjust project filters in the header, or check back once billing records are issued."
            variant="intel"
          />
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <HighlightAnchor
                key={invoice.id}
                id={`invoice-${invoice.id}`}
                highlightId={highlightInvoiceId ? `invoice-${highlightInvoiceId}` : null}
              >
                <div className="intel-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">
                      {invoice.invoice_number}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                      <Badge className={getStatusColor(invoice.status)}>
                        {formatStatus(invoice.status)}
                      </Badge>
                      <span>Issued {formatDate(invoice.issued_date)}</span>
                      {invoice.due_date && <span>Due {formatDate(invoice.due_date)}</span>}
                    </div>
                    {invoice.description && (
                      <p className="mt-1 text-sm text-slate-500">{invoice.description}</p>
                    )}
                  </div>
                  <InvoiceDownloadButton
                    invoiceId={invoice.id}
                    hasFile={Boolean(invoice.storage_path || invoice.file_url)}
                  />
                </div>
              </HighlightAnchor>
            ))}
          </div>
        )}
      </div>
    </IntelPage>
  );
}
