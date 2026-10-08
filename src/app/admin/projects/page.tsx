import { getClients } from "@/lib/data/clients";
import { getAdminProjectsListData } from "@/lib/data/projects";
import { AdminProjectsView } from "@/components/admin/admin-projects-view";

export default async function AdminProjectsPage() {
  const [data, clients] = await Promise.all([getAdminProjectsListData(), getClients()]);

  return <AdminProjectsView data={data} clients={clients} />;
}
