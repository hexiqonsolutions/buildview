import type { MembershipRole } from "@prisma/client";

export type AppRole = MembershipRole;

export const APP_ROLES = ["OWNER", "ADMIN", "SALES", "VIEWER"] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES: "Sales",
  VIEWER: "Viewer",
};
