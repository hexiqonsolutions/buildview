import { getAllUsers, getClients, getProjects } from "@/lib/actions/data";
import { AdminTable } from "@/components/admin/admin-table";
import { ManageUserDialog } from "@/components/admin/manage-user-dialog";
import { SyncUsersFromAuthButton } from "@/components/admin/sync-users-from-auth-button";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { USER_ROLE_LABELS, type ClientDashboardType, type User, type UserRole } from "@/lib/types";
import {
  CLIENT_DASHBOARD_TYPE_LABELS,
  resolveClientDashboardType,
} from "@/lib/portal/dashboard-type";
import { syncUserProfilesFromAuthDetailed } from "@/lib/supabase/provision-user";
import { Users } from "lucide-react";

export default async function AdminUsersPage() {
  const syncResult = await syncUserProfilesFromAuthDetailed();

  const [users, clients, projects] = await Promise.all([
    getAllUsers(),
    getClients(),
    getProjects(),
  ]);

  const syncedTotal = syncResult.inserted + syncResult.restored;

  return (
    <OpsWorkspacePage
      title="User Manager"
      description="Manage roles, client assignments, and project access for platform users."
      icon={Users}
      showBanner={false}
      actions={<SyncUsersFromAuthButton />}
    >
      {syncResult.error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Could not sync from Supabase Auth: {syncResult.error}. Check{" "}
          <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="text-xs">.env.local</code>, then use{" "}
          <strong>Sync from Supabase Auth</strong>.
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

      {users.length === 0 && !syncResult.error && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          Sync sees <strong>{syncResult.authCount}</strong> Auth login
          {syncResult.authCount === 1 ? "" : "s"} and{" "}
          <strong>{syncResult.profileCount}</strong> BuildView profile
          {syncResult.profileCount === 1 ? "" : "s"}. If Auth is &gt; 0 but this list is
          empty, run the SQL below in Supabase, then refresh.
          <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs dark:bg-slate-950">{`SELECT id, email, role, deleted_at FROM public.users ORDER BY created_at;`}</pre>
        </div>
      )}

      <div className="ops-card overflow-hidden">
        <AdminTable
          data={users as unknown as Array<Record<string, unknown> & { id: string }>}
          columns={[
            {
              key: "full_name",
              label: "Name",
              render: (u) => (
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {(u.full_name as string) || "—"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{(u.email as string) || "—"}</p>
                </div>
              ),
            },
            {
              key: "email",
              label: "Login email",
              render: (u) => (
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {(u.email as string) || "—"}
                </span>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (u) => (
                <Badge variant={u.role === "super_admin" ? "default" : "outline"}>
                  {USER_ROLE_LABELS[u.role as UserRole] ?? String(u.role)}
                </Badge>
              ),
            },
            {
              key: "client",
              label: "Client",
              render: (u) => {
                const client = u.client as {
                  company_name: string | null;
                  name: string;
                } | null;
                return client?.company_name || client?.name || "—";
              },
            },
            {
              key: "dashboard_type",
              label: "Dashboard",
              render: (u) => {
                const client = u.client as {
                  dashboard_type?: ClientDashboardType | null;
                } | null;
                const resolved = resolveClientDashboardType(
                  {
                    dashboard_type: u.dashboard_type as ClientDashboardType | null | undefined,
                  },
                  client
                );
                return (
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {CLIENT_DASHBOARD_TYPE_LABELS[resolved]}
                  </span>
                );
              },
            },
            {
              key: "last_sign_in_at",
              label: "Last login",
              render: (u) => {
                const at = u.last_sign_in_at as string | null;
                if (!at) return <span className="text-slate-400">Never</span>;
                return (
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {formatRelativeTime(at)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(at)}</p>
                  </div>
                );
              },
            },
            {
              key: "is_active",
              label: "Active",
              render: (u) => (
                <Badge variant={u.is_active ? "outline" : "destructive"}>
                  {u.is_active ? "Yes" : "No"}
                </Badge>
              ),
            },
            {
              key: "created_at",
              label: "Joined",
              render: (u) => formatDate(u.created_at as string),
            },
            {
              key: "actions",
              label: "Actions",
              render: (u) => (
                <ManageUserDialog
                  user={
                    u as unknown as User & {
                      client?: {
                        id: string;
                        name: string;
                        company_name: string | null;
                        dashboard_type?: ClientDashboardType | null;
                      } | null;
                    }
                  }
                  clients={clients}
                  projects={projects}
                />
              ),
            },
          ]}
          emptyMessage="No users yet. Click “Sync from Supabase Auth” or have them register/sign in once."
        />
      </div>
    </OpsWorkspacePage>
  );
}
