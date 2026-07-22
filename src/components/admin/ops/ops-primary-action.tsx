"use client";

import Link from "next/link";
import { useAdminWorkspaceHref } from "@/components/admin/workspace/use-admin-workspace-href";

export function OpsPrimaryAction({ href, label }: { href: string; label: string }) {
  const workspaceHref = useAdminWorkspaceHref(href);

  return (
    <Link href={workspaceHref} className="ops-btn-primary inline-flex h-10 items-center px-4 text-sm font-semibold">
      {label}
    </Link>
  );
}
