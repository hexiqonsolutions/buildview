import { Users } from "lucide-react";
import { getClientsWithStats } from "@/lib/actions/data";
import { CreateClientForm } from "@/components/admin/create-client-form";
import { ClientManagerTable } from "@/components/admin/clients/client-manager-table";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";

export default async function AdminClientsPage() {
  const clients = await getClientsWithStats();

  return (
    <OpsWorkspacePage
      title="Client Manager"
      description="All client organizations. Open a workspace to manage projects, uploads, and portal access."
      icon={Users}
    >
      {clients.length > 0 && (
        <div className="flex justify-end">
          <CreateClientForm />
        </div>
      )}
      <ClientManagerTable clients={clients} />
    </OpsWorkspacePage>
  );
}
