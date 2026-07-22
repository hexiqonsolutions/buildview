import { getAdminStorageStats } from "@/lib/actions/data";
import { StorageManager } from "@/components/admin/storage/storage-manager";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { HardDrive } from "lucide-react";

export default async function StorageManagerPage() {
  const stats = await getAdminStorageStats();

  return (
    <OpsWorkspacePage
      title="Storage Manager"
      description="Per-client storage usage across documents, reports, site photos, and Matterport tours."
      icon={HardDrive}
    >
      <StorageManager stats={stats} />
    </OpsWorkspacePage>
  );
}
