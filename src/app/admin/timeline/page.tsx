import { getScopedTimelinePageData, parseWorkspaceScopeFromParams } from "@/lib/admin/scope-server";
import { TimelineManagerShell } from "@/components/admin/timeline/timeline-manager-shell";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);
  const data = await getScopedTimelinePageData(scope);
  const initialProjectId = data.projects[0]?.id ?? scope.projectId ?? undefined;

  return (
    <TimelineManagerShell data={data} initialProjectId={initialProjectId} />
  );
}
