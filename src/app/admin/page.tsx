import { getCurrentUser } from "@/lib/actions/auth";
import { getAdminOperationsStats } from "@/lib/actions/data";
import { OperationsDashboard } from "@/components/admin/ops/operations-dashboard";

export default async function AdminDashboardPage() {
  const [stats, user] = await Promise.all([
    getAdminOperationsStats(),
    getCurrentUser(),
  ]);

  const firstName =
    user?.full_name?.trim().split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <OperationsDashboard
      stats={stats}
      firstName={firstName}
      fullName={user?.full_name}
      email={user?.email}
      avatarUrl={user?.avatar_url}
    />
  );
}
