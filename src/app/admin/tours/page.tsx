import { getScopedTours, parseWorkspaceScopeFromParams } from "@/lib/admin/scope-server";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { MatterportManager } from "@/components/admin/matterport/matterport-manager";
import { getChecklistPercentByTour } from "@/lib/data/progression";
import { Camera } from "lucide-react";

export default async function AdminToursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);
  const tours = await getScopedTours(scope);
  const scanPercents = await getChecklistPercentByTour(tours).catch(() => ({}));

  return (
    <OpsWorkspacePage
      title="Tour Manager"
      description="Virtual tours grouped by project, newest first. Follows the portal switcher in the sidebar."
      icon={Camera}
    >
      <MatterportManager tours={tours} scanPercents={scanPercents} />
    </OpsWorkspacePage>
  );
}
