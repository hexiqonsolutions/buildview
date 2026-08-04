import { Suspense } from "react";
import { MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import { leadFiltersSchema } from "@/lib/leads/schema";
import { getLeadFilterOptions, listLeads } from "@/lib/leads/queries";
import { AppTopbar } from "@/components/layout/app-topbar";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const parsedFilters = leadFiltersSchema.safeParse({
    q: first(params.q),
    status: first(params.status),
    priority: first(params.priority),
    leadSource: first(params.leadSource),
    industry: first(params.industry),
    page: first(params.page) ?? "1",
    pageSize: first(params.pageSize) ?? "20",
  });

  const filters = parsedFilters.success
    ? parsedFilters.data
    : { page: 1, pageSize: 20 };

  let list = {
    total: 0,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: 1,
    items: [] as Awaited<ReturnType<typeof listLeads>>["items"],
  };
  let options: Awaited<ReturnType<typeof getLeadFilterOptions>> = {
    sources: [],
    industries: [],
    tags: [],
  };

  try {
    [list, options] = await Promise.all([
      listLeads(session.organization.id, filters),
      getLeadFilterOptions(session.organization.id),
    ]);
  } catch (error) {
    console.error("Leads page query failed:", error);
  }

  return (
    <div>
      <AppTopbar
        title="Leads"
        description={`${list.total} records · ${session.membership.role}`}
      />
      <Suspense fallback={<div className="p-7 text-sm text-zinc-500">Loading leads…</div>}>
        <LeadsWorkspace
          role={session.membership.role as MembershipRole}
          total={list.total}
          page={list.page}
          pageCount={list.pageCount}
          pageSize={list.pageSize}
          items={list.items}
          sources={options.sources}
          industries={options.industries}
        />
      </Suspense>
    </div>
  );
}
