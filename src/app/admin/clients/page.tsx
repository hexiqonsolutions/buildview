import { Users } from "lucide-react";
import { getClientsWithStats } from "@/lib/data/clients";
import { getUserProfile } from "@/lib/supabase/server";
import { canImpersonate } from "@/lib/auth/permissions";
import { CreateClientForm } from "@/components/admin/create-client-form";
import { ClientManagerTable } from "@/components/admin/clients/client-manager-table";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";

export default async function AdminClientsPage() {
  const [clients, profile] = await Promise.all([getClientsWithStats(), getUserProfile()]);
  const canLoginAsClient = Boolean(profile && canImpersonate(profile.role));

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
      <ClientManagerTable clients={clients} canLoginAsClient={canLoginAsClient} />
    </OpsWorkspacePage>
  );
}
