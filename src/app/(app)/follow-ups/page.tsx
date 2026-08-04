import { Suspense } from "react";
import { MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import {
  getFollowUpCounts,
  listFollowUps,
  listLeadsForFollowUp,
} from "@/lib/follow-ups/queries";
import type { FollowUpBucket } from "@/lib/follow-ups/schema";
import { AppTopbar } from "@/components/layout/app-topbar";
import { FollowUpsWorkspace } from "@/components/follow-ups/follow-ups-workspace";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const BUCKETS: FollowUpBucket[] = [
  "today",
  "upcoming",
  "overdue",
  "all",
  "done",
];

export default async function FollowUpsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const bucketParam = first(params.bucket) ?? "today";
  const bucket = BUCKETS.includes(bucketParam as FollowUpBucket)
    ? (bucketParam as FollowUpBucket)
    : "today";

  let items: Awaited<ReturnType<typeof listFollowUps>> = [];
  let counts = { today: 0, upcoming: 0, overdue: 0 };
  let leads: Awaited<ReturnType<typeof listLeadsForFollowUp>> = [];

  try {
    [items, counts, leads] = await Promise.all([
      listFollowUps({
        organizationId: session.organization.id,
        bucket,
      }),
      getFollowUpCounts(session.organization.id),
      listLeadsForFollowUp(session.organization.id),
    ]);
  } catch (error) {
    console.error("Follow-ups page failed:", error);
  }

  return (
    <div>
      <AppTopbar
        title="Follow-ups"
        description={`${counts.today} due today · ${counts.overdue} overdue`}
      />
      <Suspense
        fallback={
          <div className="p-7 text-sm text-zinc-500">Loading follow-ups…</div>
        }
      >
        <FollowUpsWorkspace
          role={session.membership.role as MembershipRole}
          bucket={bucket}
          items={items}
          counts={counts}
          leads={leads}
        />
      </Suspense>
    </div>
  );
}
