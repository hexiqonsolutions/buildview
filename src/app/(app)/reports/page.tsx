import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/session";
import { getReportsData } from "@/lib/reports/queries";
import { isReportRange, type ReportRange } from "@/lib/reports/schema";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const rangeParam = first(params.range);
  const range: ReportRange = isReportRange(rangeParam) ? rangeParam : "30d";

  const data = await getReportsData(session.organization.id, range);

  return (
    <div>
      <AppTopbar
        title="Reports"
        description={`${data.rangeLabel} · pipeline, conversion, activities`}
      />
      <Suspense
        fallback={
          <div className="p-7 text-sm text-zinc-500">Loading reports…</div>
        }
      >
        <ReportsWorkspace data={data} />
      </Suspense>
    </div>
  );
}
