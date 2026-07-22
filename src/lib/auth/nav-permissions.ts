"use client";

import { can, type PermissionResource } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  resource: PermissionResource;
};

export function filterNavByRole<T extends NavItem>(items: T[], role: UserRole): T[] {
  return items.filter((item) => can(role, "read", item.resource));
}
