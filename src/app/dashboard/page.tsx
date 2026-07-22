import { getCurrentUser } from "@/lib/actions/auth";
import { parsePortalWorkspaceScopeFromParams } from "@/lib/portal/scope-server";
import { getPortalScopedDashboardData } from "@/lib/portal/dashboard-data";
import { getPortfolioDashboardData } from "@/lib/portal/portfolio-data";
import { getPortalWorkspaceBootstrap } from "@/lib/actions/data";
import { ExecutiveOverviewShell } from "@/components/intel/dashboard/executive-overview-shell";
import { PortfolioShowcaseShell } from "@/components/intel/dashboard/portfolio-showcase-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  const bootstrap = await getPortalWorkspaceBootstrap();
  const isPortfolio = bootstrap.dashboardType === "portfolio";

  const [user, data, portfolioData] = await Promise.all([
    getCurrentUser(),
    isPortfolio ? Promise.resolve(null) : getPortalScopedDashboardData(scope),
    isPortfolio ? getPortfolioDashboardData(scope) : Promise.resolve(null),
  ]);

  const firstName =
    user?.full_name?.trim().split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  if (isPortfolio && portfolioData) {
    return <PortfolioShowcaseShell data={portfolioData} />;
  }

  return <ExecutiveOverviewShell firstName={firstName} data={data!} />;
}
