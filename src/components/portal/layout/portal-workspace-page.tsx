import type { LucideIcon } from "lucide-react";
import { IntelPage } from "@/components/intel/pages/intel-page";

interface PortalWorkspacePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

/** @deprecated Use IntelPage — kept for backward compatibility. */
export function PortalWorkspacePage(props: PortalWorkspacePageProps) {
  return <IntelPage {...props} />;
}
