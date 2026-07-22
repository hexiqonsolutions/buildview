import { Settings } from "lucide-react";
import { PlatformSettingsPanel } from "@/components/admin/settings/platform-settings-panel";
import { IntegrationsStatusPanel } from "@/components/admin/settings/integrations-status-panel";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { getIntegrationsStatus } from "@/lib/actions/integrations-status";
import { getPlatformSettings } from "@/lib/actions/platform-settings";

export default async function AdminSettingsPage() {
  const [initialSettings, integrationsStatus] = await Promise.all([
    getPlatformSettings(),
    getIntegrationsStatus(),
  ]);

  return (
    <OpsWorkspacePage
      title="Settings"
      description="Platform branding, defaults, and notification rules for BuildView operations."
      icon={Settings}
    >
      <div className="space-y-6">
        <PlatformSettingsPanel initialSettings={initialSettings} />
        <IntegrationsStatusPanel status={integrationsStatus} />
      </div>
    </OpsWorkspacePage>
  );
}
