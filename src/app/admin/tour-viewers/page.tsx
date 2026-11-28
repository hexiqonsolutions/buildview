import { redirect } from "next/navigation";
import { ContactRound } from "lucide-react";
import { TourViewersTable } from "@/components/admin/tour-viewers/tour-viewers-table";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { listAllTourShareViewers } from "@/lib/actions/tour-shares";
import { hasStaffPermission } from "@/lib/auth/staff";
import { getProjects } from "@/lib/data/projects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkAnalyticsPanel } from "@/components/admin/analytics/link-analytics-panel";

export default async function AdminTourViewersPage() {
  if (!(await hasStaffPermission("read", "tour_viewers"))) redirect("/admin");

  const [viewers, projects] = await Promise.all([
    listAllTourShareViewers({ limit: 500 }),
    getProjects(),
  ]);

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  return (
    <OpsWorkspacePage
      title="Tour Viewers"
      description="How shared 360 tour links are used: opens, unique visitors, unlocks and time in tour, plus the people who filled the form."
      icon={ContactRound}
      showBanner={false}
    >
      <Tabs defaultValue="analytics" className="space-y-5">
        <TabsList>
          <TabsTrigger value="analytics">Link analytics</TabsTrigger>
          <TabsTrigger value="viewers">Viewers</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
          <LinkAnalyticsPanel projects={projectOptions} />
        </TabsContent>
        <TabsContent value="viewers">
          <TourViewersTable initialRows={viewers} projects={projectOptions} />
        </TabsContent>
      </Tabs>
    </OpsWorkspacePage>
  );
}
