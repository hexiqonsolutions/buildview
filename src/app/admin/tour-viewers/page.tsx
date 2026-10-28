import { redirect } from "next/navigation";
import { ContactRound } from "lucide-react";
import { TourViewersTable } from "@/components/admin/tour-viewers/tour-viewers-table";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { listAllTourShareViewers } from "@/lib/actions/tour-shares";
import { hasStaffPermission } from "@/lib/auth/staff";
import { getProjects } from "@/lib/data/projects";

export default async function AdminTourViewersPage() {
  if (!(await hasStaffPermission("read", "tour_viewers"))) redirect("/admin");

  const [viewers, projects] = await Promise.all([
    listAllTourShareViewers({ limit: 500 }),
    getProjects(),
  ]);

  return (
    <OpsWorkspacePage
      title="Tour Viewers"
      description="Name, phone, and email collected when someone opens a shared Matterport tour link."
      icon={ContactRound}
      showBanner={false}
    >
      <TourViewersTable
        initialRows={viewers}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      />
    </OpsWorkspacePage>
  );
}
