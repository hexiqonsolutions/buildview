import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/page-header";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <PageHeader title={title} description={description}>
      {actions}
    </PageHeader>
  );
}
