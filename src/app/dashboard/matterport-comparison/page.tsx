import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getComparisonProjectsData, listSavedComparisons } from "@/lib/actions/comparison";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPortalWorkspaceBootstrap } from "@/lib/actions/data";
import { CompareProgressHub } from "@/components/compare/compare-progress-hub";
import { Loader2 } from "lucide-react";

export default async function MatterportComparisonPage() {
  const bootstrap = await getPortalWorkspaceBootstrap();
  if (bootstrap.dashboardType === "portfolio") {
    redirect("/dashboard");
  }

  const [initialData, user, initialSaved] = await Promise.all([
    getComparisonProjectsData(),
    getCurrentUser(),
    listSavedComparisons(),
  ]);
  const isAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Compare Construction Progress
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Compare any two site visits and instantly understand project progress.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <CompareProgressHub
          initialData={initialData}
          initialSaved={initialSaved}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
}
