import {
  getPortalScopedInvoices,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Receipt } from "lucide-react";
import { formatDate, formatStatus, getStatusColor, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);
  const invoices = await getPortalScopedInvoices(scope);

  return (
    <IntelPage
      title="Invoices"
      description="View and download your billing records."
      icon={Receipt}
      eyebrow="Billing"
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Invoices" />

        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices in this workspace"
            description="Adjust project filters in the header, or check back once billing records are issued."
            variant="intel"
          />
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="intel-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
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
                {invoice.file_url && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <a href={invoice.file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </IntelPage>
  );
}
