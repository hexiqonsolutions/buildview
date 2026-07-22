import {
  getPortalScopedNotifications,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { NotificationsCenter } from "@/components/admin/notifications/notifications-center";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);
  const notifications = await getPortalScopedNotifications(scope);

  return (
    <IntelPage
      title="Notifications"
      description="Alerts for project uploads, invoices, and platform updates."
      icon={Bell}
      eyebrow="Alerts"
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Notifications" />
        <NotificationsCenter notifications={notifications} scopedEmpty />
      </div>
    </IntelPage>
  );
}
