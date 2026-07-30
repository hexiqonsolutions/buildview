import { ReceiptIndianRupee } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { InvoiceDownloadButton } from "@/components/invoices/invoice-download-button";
import { formatCurrency, formatDate, formatStatus, getStatusColor } from "@/lib/utils";
import type { Invoice } from "@/lib/types";

export function ProjectInvoicesSection({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIndianRupee}
        title="No invoices for this project."
        description="Billing records will appear here when issued."
      />
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="portal-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{invoice.invoice_number}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
              <Badge className={getStatusColor(invoice.status)}>
                {formatStatus(invoice.status)}
              </Badge>
              <span>Issued {formatDate(invoice.issued_date)}</span>
            </div>
          </div>
          <InvoiceDownloadButton
            invoiceId={invoice.id}
            hasFile={Boolean(invoice.storage_path || invoice.file_url)}
          />
        </div>
      ))}
    </div>
  );
}
