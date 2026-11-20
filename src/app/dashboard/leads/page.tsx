import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { getProjects } from "@/lib/data/projects";
import { getPortalWorkspaceBootstrap } from "@/lib/data/workspace";
import { getBuyerLeads } from "@/lib/portal/property-dashboard-data";
import { isPropertyDashboard } from "@/lib/portal/dashboard-type";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { BuyerLeadsTable } from "@/components/portal/buyer-leads-table";

export const dynamic = "force-dynamic";

export default async function BuyerLeadsPage() {
  const bootstrap = await getPortalWorkspaceBootstrap();
  if (!isPropertyDashboard(bootstrap.dashboardType)) {
    redirect("/dashboard");
  }

  const projects = await getProjects();
  const { leads } = await getBuyerLeads(
    projects.map((p) => ({ id: p.id, name: p.name })),
    2000
  ).catch(() => ({ leads: [], activeLinks: 0 }));

  return (
    <IntelPage
      title="Buyer leads"
      description="Everyone who opened a walkthrough you shared, newest first."
      icon={UsersRound}
    >
      <BuyerLeadsTable
        leads={leads}
        properties={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </IntelPage>
  );
}
