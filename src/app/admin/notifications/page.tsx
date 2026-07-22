import { getNotifications } from "@/lib/actions/notifications";
import { NotificationsCenter } from "@/components/admin/notifications/notifications-center";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { Bell } from "lucide-react";

export default async function AdminNotificationsPage() {
  const notifications = await getNotifications();

  return (
    <OpsWorkspacePage
      title="Notifications"
      description="System alerts for uploads, critical issues, invoices, and platform events."
      icon={Bell}
    >
      <NotificationsCenter notifications={notifications} />
    </OpsWorkspacePage>
  );
}
