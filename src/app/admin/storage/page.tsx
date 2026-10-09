import { getAdminStorageStats } from "@/lib/data/storage";
import { StorageManager } from "@/components/admin/storage/storage-manager";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { HardDrive } from "lucide-react";

export default async function StorageManagerPage() {
  const stats = await getAdminStorageStats();

  return (
    <OpsWorkspacePage
      title="Storage Manager"
      description="Supabase Storage usage against your plan's quota, by file type and client."
      icon={HardDrive}
    >
      <StorageManager stats={stats} />
    </OpsWorkspacePage>
  );
}
