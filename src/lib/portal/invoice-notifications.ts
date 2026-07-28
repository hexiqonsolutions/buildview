import { portalInvoiceLink } from "@/lib/portal/notification-links";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { NotificationType } from "@/lib/types";

export type InvoiceNotificationKind = "sent" | "pending" | "paid" | "overdue";

export type InvoiceNotifyFields = {
  id: string;
  client_id: string;
  project_id?: string | null;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date?: string | null;
};

export type InvoiceNotifyPayload = {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  sendEmail?: boolean;
};

export function buildInvoiceNotificationPayload(
  invoice: InvoiceNotifyFields,
  kind: InvoiceNotificationKind
): InvoiceNotifyPayload {
  const amountLabel = formatCurrency(invoice.amount, invoice.currency);
  const link = portalInvoiceLink(invoice.project_id, invoice.id);
  const dueLabel = invoice.due_date ? formatDate(invoice.due_date) : null;

  switch (kind) {
    case "sent":
      return {
        title: `Invoice ${invoice.invoice_number} sent`,
        message: `A new invoice for ${amountLabel} is ready to view in your portal.`,
        type: "invoice_update",
        link,
      };
    case "pending":
      return {
        title: `Payment due — ${invoice.invoice_number}`,
        message: dueLabel
          ? `Invoice ${invoice.invoice_number} for ${amountLabel} is awaiting payment (due ${dueLabel}).`
          : `Invoice ${invoice.invoice_number} for ${amountLabel} is awaiting payment.`,
        type: "warning",
        link,
      };
    case "paid":
      return {
        title: `Invoice ${invoice.invoice_number} paid`,
        message: `Payment of ${amountLabel} has been recorded. Thank you.`,
        type: "success",
        link,
      };
    case "overdue":
      return {
        title: `Overdue — ${invoice.invoice_number}`,
        message: dueLabel
          ? `Invoice ${invoice.invoice_number} for ${amountLabel} was due ${dueLabel} and is now overdue.`
          : `Invoice ${invoice.invoice_number} for ${amountLabel} is overdue. Please arrange payment.`,
        type: "error",
        link,
      };
  }
}
