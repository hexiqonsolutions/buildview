import { getActivityLogs } from "@/lib/actions/activity";
import { getProjects, getAllUsers } from "@/lib/actions/data";
import { ActivityLogViewer } from "@/components/admin/activity/activity-log-viewer";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { Activity } from "lucide-react";

export default async function ActivityLogsPage() {
  const [logs, projects, users] = await Promise.all([
    getActivityLogs({ limit: 100 }),
    getProjects(),
    getAllUsers(),
  ]);

  return (
    <OpsWorkspacePage
      title="Activity Logs"
      description="Filter and export every action across BuildView operations — uploads, impersonation, and timeline updates."
      icon={Activity}
    >
      <ActivityLogViewer initialLogs={logs} projects={projects} users={users} />
    </OpsWorkspacePage>
  );
}
