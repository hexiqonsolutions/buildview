import type { Notification } from "@/lib/types";
import type { WorkspaceScope } from "@/lib/admin/workspace";

const PROJECT_LINK_PATTERNS = [
  /\/dashboard\/projects\/([0-9a-f-]{36})/i,
  /[?&]project=([0-9a-f-]{36})/i,
];

export function projectIdFromNotificationLink(link: string | null): string | null {
  if (!link) return null;
  for (const pattern of PROJECT_LINK_PATTERNS) {
    const match = link.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isNarrowPortalScope(scope: WorkspaceScope): boolean {
  return Boolean(
    scope.projectId ||
      scope.building !== "all" ||
      scope.floor !== "all" ||
      scope.buildingId ||
      scope.floorId
  );
}

export function filterNotificationsByProjectScope(
  notifications: Notification[],
  scopedProjectIds: Set<string>,
  scope: WorkspaceScope
): Notification[] {
  if (!isNarrowPortalScope(scope)) return notifications;

  return notifications.filter((notification) => {
    const projectId = projectIdFromNotificationLink(notification.link);
    if (!projectId) return true;
    return scopedProjectIds.has(projectId);
  });
}
