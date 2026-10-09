import { getClients } from "@/lib/data/clients";
import { getProjects } from "@/lib/data/projects";
import { getAllUsers } from "@/lib/data/users";
import { getCurrentUser } from "@/lib/actions/auth";
import { SyncUsersFromAuthButton } from "@/components/admin/sync-users-from-auth-button";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { UserDirectory } from "@/components/admin/users/user-directory";
import { canAssignRoles } from "@/lib/auth/roles";
import { groupUsersByOrganization } from "@/lib/admin/user-groups";
import { syncUserProfilesFromAuthDetailed } from "@/lib/supabase/provision-user";
import { Users } from "lucide-react";

export default async function AdminUsersPage() {
  const syncResult = await syncUserProfilesFromAuthDetailed();

  const [users, clients, projects, currentUser] = await Promise.all([
    getAllUsers(),
    getClients(),
    getProjects(),
    getCurrentUser(),
  ]);

  const allowAssignRoles = currentUser ? canAssignRoles(currentUser.role) : false;
  const groups = groupUsersByOrganization(users, clients);

  const syncedTotal = syncResult.inserted + syncResult.restored;

  return (
    <OpsWorkspacePage
      title="User Manager"
      description="Accounts grouped by organization: the BuildView team first, then each client company."
      icon={Users}
      showBanner={false}
      actions={<SyncUsersFromAuthButton />}
    >
      {syncResult.error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {syncResult.error} Try <strong>Sync from Supabase Auth</strong> again, or contact
          BuildView support if it keeps failing.
        </div>
      )}

      {syncedTotal > 0 && !syncResult.error && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          Synced {syncedTotal} user{syncedTotal === 1 ? "" : "s"} from Supabase Auth
          {syncResult.restored > 0
            ? ` (${syncResult.restored} restored from soft-delete)`
            : ""}
          .
        </div>
      )}

      {users.length === 0 && !syncResult.error ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Sync sees <strong>{syncResult.authCount}</strong> Auth login
          {syncResult.authCount === 1 ? "" : "s"} and{" "}
          <strong>{syncResult.profileCount}</strong> BuildView profile
          {syncResult.profileCount === 1 ? "" : "s"}. If there are Auth logins but this list
          is empty, contact BuildView support.
        </div>
      ) : (
        <UserDirectory
          groups={groups}
          clients={clients}
          projects={projects}
          canAssignRoles={allowAssignRoles}
        />
      )}
    </OpsWorkspacePage>
  );
}
