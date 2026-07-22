import { getAdminProjectsListData, getClients } from "@/lib/actions/data";
import { AdminProjectsView } from "@/components/admin/admin-projects-view";

export default async function AdminProjectsPage() {
  const [data, clients] = await Promise.all([getAdminProjectsListData(), getClients()]);

  return <AdminProjectsView data={data} clients={clients} />;
}
