"use client";

import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs";
import type { ComponentProps } from "react";

type ProjectHubTabsProps = Omit<ComponentProps<typeof ProjectDetailTabs>, "variant">;

export function ProjectHubTabs(props: ProjectHubTabsProps) {
  return <ProjectDetailTabs {...props} variant="intel" />;
}
