import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveActor } from "@/lib/auth/project-access";
import { isBuildViewStaffRole } from "@/lib/auth/roles";
import { getProgressReport } from "@/lib/data/progress-report";
import { todayInIndia } from "@/lib/progression/checklist-completion";
import { ProgressReportView } from "@/components/projects/progression/report/progress-report-view";
import { ReportPrintToolbar } from "@/components/projects/progression/report/report-print-toolbar";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { projectId: string };
type Search = { from?: string; to?: string };

const isDay = (v: string | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

function period(search: Search): { from: string; to: string } {
  const to = isDay(search.to) ? search.to : todayInIndia();
  if (isDay(search.from)) return { from: search.from, to };
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 29);
  return { from: d.toISOString().slice(0, 10), to };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const { from, to } = period(await searchParams);
  const result = await getProgressReport(projectId, from, to).catch(() => null);
  const name = result?.ok ? result.report.project.name : "Project";
  // The browser uses the title as the default PDF file name.
  return { title: `${name} progress report ${to}`, robots: { index: false, follow: false } };
}

export default async function ProgressReportPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { projectId } = await params;
  const { from, to } = period(await searchParams);
  const result = await getProgressReport(projectId, from, to);

  if (!result.ok) {
    if (result.reason === "signin") {
      redirect(`/login?redirect=${encodeURIComponent(`/report/progress/${projectId}?from=${from}&to=${to}`)}`);
    }
    if (result.reason === "invalid") notFound();
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-semibold text-slate-900">Report not available</h1>
        <p className="mt-2 text-sm text-slate-600">
          {result.reason === "forbidden"
            ? "You don't have access to this project's progress report."
            : "Progress reports are available for Construction Intelligence projects with progression set up."}
        </p>
      </main>
    );
  }

  const actor = await getActiveActor();
  const base = actor && isBuildViewStaffRole(actor.role as UserRole) ? "/admin/projects" : "/dashboard/projects";

  return (
    <div className="report-root min-h-screen bg-slate-100 pb-10">
      <style>{`
        .report-root { color-scheme: light; }
        @page { size: A4; margin: 10mm; }
        @media print {
          html, body { background: #fff !important; }
          .report-root { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .report-no-print { display: none !important; }
          .report-paper { max-width: none !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; }
          .report-section h2 { break-after: avoid; }
          .report-row, .report-plan, figure { break-inside: avoid; }
          .report-paper-shadow { box-shadow: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <ReportPrintToolbar backHref={`${base}/${projectId}?tab=progression`} />
      <div className="mt-6 px-2 sm:px-4">
        <div className="report-paper-shadow mx-auto max-w-[210mm] shadow-sm">
          <ProgressReportView report={result.report} />
        </div>
      </div>
    </div>
  );
}
