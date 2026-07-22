import { getAdminOperationsStats } from "@/lib/actions/data";
import { OperationsDashboard } from "@/components/admin/ops/operations-dashboard";

export default async function AdminDashboardPage() {
  const stats = await getAdminOperationsStats();
  return <OperationsDashboard stats={stats} />;
}
