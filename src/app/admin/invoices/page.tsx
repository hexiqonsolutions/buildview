import { ReceiptIndianRupee } from "lucide-react";
import { getClients } from "@/lib/data/clients";
import { getAdminInvoices } from "@/lib/data/invoices";
import { getProjects } from "@/lib/data/projects";
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
      icon={ReceiptIndianRupee}
    >
      <InvoiceManager invoices={invoices} clients={clients} projects={projects} />
    </OpsWorkspacePage>
  );
}
