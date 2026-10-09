import { isBuildViewStaffRole } from "@/lib/auth/roles";
import type { Client, ClientDashboardType } from "@/lib/types";
import type { AdminUserRow } from "@/lib/data/users";

export type UserGroupKind = "staff" | "organization" | "unassigned";

export type UserGroup = {
  id: string;
  kind: UserGroupKind;
  name: string;
  clientId: string | null;
  dashboardType: ClientDashboardType | null;
  /** Staff suspended the client company (clients.is_active = false). */
  isSuspended: boolean;
  users: AdminUserRow[];
  activeCount: number;
};

function makeGroup(
  base: Omit<UserGroup, "users" | "activeCount">,
  users: AdminUserRow[]
): UserGroup {
  return { ...base, users, activeCount: users.filter((u) => u.is_active).length };
}

/**
 * BuildView staff first, then one group per client organization (busiest first,
 * including organizations without accounts), then client accounts not linked to any company.
 */
export function groupUsersByOrganization(users: AdminUserRow[], clients: Client[]): UserGroup[] {
  const staff: AdminUserRow[] = [];
  const unassigned: AdminUserRow[] = [];
  const byClient = new Map<string, AdminUserRow[]>();

  for (const user of users) {
    if (isBuildViewStaffRole(user.role)) {
      staff.push(user);
    } else if (user.client_id) {
      byClient.set(user.client_id, [...(byClient.get(user.client_id) ?? []), user]);
    } else {
      unassigned.push(user);
    }
  }

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const clientIds = new Set([...clients.map((c) => c.id), ...byClient.keys()]);

  const organizations = Array.from(clientIds)
    .map((clientId) => {
      const members = byClient.get(clientId) ?? [];
      const client = clientById.get(clientId);
      const joined = members[0]?.client;
      return makeGroup(
        {
          id: clientId,
          kind: "organization",
          name: client?.company_name || client?.name || joined?.company_name || joined?.name || "Unknown organization",
          clientId,
          dashboardType: client?.dashboard_type ?? joined?.dashboard_type ?? null,
          isSuspended: client ? !client.is_active : false,
        },
        members
      );
    })
    .sort((a, b) => b.users.length - a.users.length || a.name.localeCompare(b.name));

  const groups: UserGroup[] = [
    makeGroup(
      {
        id: "buildview-team",
        kind: "staff",
        name: "BuildView team",
        clientId: null,
        dashboardType: null,
        isSuspended: false,
      },
      staff
    ),
    ...organizations,
  ];

  if (unassigned.length > 0) {
    groups.push(
      makeGroup(
        {
          id: "unassigned",
          kind: "unassigned",
          name: "No organization",
          clientId: null,
          dashboardType: null,
          isSuspended: false,
        },
        unassigned
      )
    );
  }

  return groups;
}
