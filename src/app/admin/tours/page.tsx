import { getScopedTours, parseWorkspaceScopeFromParams } from "@/lib/admin/scope-server";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { MatterportManager } from "@/components/admin/matterport/matterport-manager";
import { Camera } from "lucide-react";

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);
  const tours = await getScopedTours(scope);

  return (
    <OpsWorkspacePage
      title="Matterport Manager"
      description="All virtual tours across the active workspace. Upload, preview, compare, and manage scan versions."
      icon={Camera}
    >
      <MatterportManager tours={tours} />
    </OpsWorkspacePage>
  );
}
