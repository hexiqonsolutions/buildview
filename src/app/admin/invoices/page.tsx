import { Receipt } from "lucide-react";
import { getAdminInvoices, getClients, getProjects } from "@/lib/actions/data";
import { InvoiceManager } from "@/components/admin/invoices/invoice-manager";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";

export default async function AdminInvoicesPage() {
  const [invoices, clients, projects] = await Promise.all([
    getAdminInvoices(),
    getClients(),
    getProjects(),
  ]);

  return (
    <OpsWorkspacePage
      title="Invoice Manager"
      description="Create invoices, attach PDFs, update payment status, and notify clients when sent."
      icon={Receipt}
    >
      <InvoiceManager invoices={invoices} clients={clients} projects={projects} />
    </OpsWorkspacePage>
  );
}
