import { getNotifications } from "@/lib/actions/notifications";
import { NotificationsCenter } from "@/components/admin/notifications/notifications-center";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientNotificationsPage() {
  // Inbox matches the header badge — do not filter by workspace project scope.
  const notifications = await getNotifications();

  return (
    <IntelPage
      title="Notifications"
      description="Alerts for project uploads, invoices, and platform updates."
      icon={Bell}
      eyebrow="Alerts"
    >
      <NotificationsCenter notifications={notifications} />
    </IntelPage>
  );
}
