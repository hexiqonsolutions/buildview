import { Suspense } from "react";
import { ActivityType, MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import {
  getActivityCounts,
  listActivities,
  listLeadsForActivity,
} from "@/lib/activities/queries";
import { ACTIVITY_TYPES, type ActivityFilter } from "@/lib/activities/schema";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ActivitiesWorkspace } from "@/components/activities/activities-workspace";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const typeParam = first(params.type);
  const filter: ActivityFilter =
    typeParam && ACTIVITY_TYPES.includes(typeParam as ActivityType)
      ? (typeParam as ActivityType)
      : "all";
  const q = first(params.q);
  const leadId = first(params.leadId);

  let items: Awaited<ReturnType<typeof listActivities>> = [];
  let counts: Record<ActivityType | "all", number> = {
    all: 0,
    CALL: 0,
    MEETING: 0,
    EMAIL: 0,
    TASK: 0,
    NOTE: 0,
  };
  let leads: Awaited<ReturnType<typeof listLeadsForActivity>> = [];

  try {
    [items, counts, leads] = await Promise.all([
      listActivities({
        organizationId: session.organization.id,
        filter,
        q,
        leadId,
      }),
      getActivityCounts(session.organization.id),
      listLeadsForActivity(session.organization.id),
    ]);
  } catch (error) {
    console.error("Activities page failed:", error);
  }

  return (
    <div>
      <AppTopbar
        title="Activities"
        description={`${counts.all} events · calls, meetings, emails, tasks, notes`}
      />
      <Suspense
        fallback={
          <div className="p-7 text-sm text-zinc-500">Loading timeline…</div>
        }
      >
        <ActivitiesWorkspace
          role={session.membership.role as MembershipRole}
          filter={filter}
          items={items}
          counts={counts}
          leads={leads}
        />
      </Suspense>
    </div>
  );
}
