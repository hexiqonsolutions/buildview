import { getClientTimelinePageData } from "@/lib/actions/data";
import {
  getPortalScopedTimelinePageData,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { PortalTimelineShell } from "@/components/portal/timeline/portal-timeline-shell";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);

  const [{ isDemo }, data] = await Promise.all([
    getClientTimelinePageData(),
    getPortalScopedTimelinePageData(scope),
  ]);

  const initialProjectId = data.projects[0]?.id ?? scope.projectId ?? undefined;

  return (
    <PortalTimelineShell data={data} isDemo={isDemo} initialProjectId={initialProjectId} />
  );
}
