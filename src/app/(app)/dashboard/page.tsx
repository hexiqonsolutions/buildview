import { requireAuth } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/metrics";
import { AppTopbar } from "@/components/layout/app-topbar";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const session = await requireAuth();
  const data = await getDashboardData(session.organization.id);

  return (
    <div>
      <AppTopbar
        title="Dashboard"
        description={`${session.organization.name} · ${session.membership.role} · live pipeline overview`}
      />
      <DashboardView
        organizationName={session.organization.name}
        data={data}
      />
    </div>
  );
}
