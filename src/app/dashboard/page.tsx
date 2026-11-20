import { getCurrentUser } from "@/lib/actions/auth";
import { parsePortalWorkspaceScopeFromParams } from "@/lib/portal/scope-server";
import { getPortalScopedDashboardData } from "@/lib/portal/dashboard-data";
import { getPortfolioDashboardData } from "@/lib/portal/portfolio-data";
import { getPortalWorkspaceBootstrap } from "@/lib/data/workspace";
import { ExecutiveOverviewShell } from "@/components/intel/dashboard/executive-overview-shell";
import { PortfolioShowcaseShell } from "@/components/intel/dashboard/portfolio-showcase-shell";
import { can } from "@/lib/auth/permissions";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { isPropertyDashboard, isShowcaseDashboard } from "@/lib/portal/dashboard-type";
import { getPropertyDashboardData } from "@/lib/portal/property-dashboard-data";
import { PropertyShowcaseShell } from "@/components/intel/dashboard/property-showcase-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  const bootstrap = await getPortalWorkspaceBootstrap();
  const isPortfolio = isShowcaseDashboard(bootstrap.dashboardType);
  const isProperty = isPropertyDashboard(bootstrap.dashboardType);

  const [user, data, portfolioData, propertyData] = await Promise.all([
    getCurrentUser(),
    isPortfolio ? Promise.resolve(null) : getPortalScopedDashboardData(scope),
    isPortfolio && !isProperty ? getPortfolioDashboardData(scope) : Promise.resolve(null),
    isProperty
      ? getPropertyDashboardData().catch((error) => {
          console.error("[dashboard] property data failed:", error);
          return {
            clientName: bootstrap.clientName,
            stats: { properties: 0, leadsThisWeek: 0, totalLeads: 0, activeLinks: 0 },
            properties: [],
            recentLeads: [],
          };
        })
      : Promise.resolve(null),
  ]);

  const firstName =
    user?.full_name?.trim().split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";
  const canUpdateStatus = user ? can(user.role, "update", "projects") : false;
  // Staff on /dashboard keep the original overview. Impersonation swaps the
  // session to the client user, so they correctly get Construction Intelligence.
  const overviewVariant =
    user && isBuildViewStaffRole(user.role) ? "original" : "construction";

  if (isProperty && propertyData) {
    return <PropertyShowcaseShell data={propertyData} firstName={firstName} />;
  }

  if (isPortfolio && portfolioData) {
    return (
      <PortfolioShowcaseShell
        data={portfolioData}
        firstName={firstName}
        fullName={user?.full_name}
        email={user?.email}
        avatarUrl={user?.avatar_url}
      />
    );
  }

  return (
    <ExecutiveOverviewShell
      firstName={firstName}
      fullName={user?.full_name}
      email={user?.email}
      avatarUrl={user?.avatar_url}
      data={data!}
      canUpdateStatus={canUpdateStatus}
      variant={overviewVariant}
    />
  );
}
