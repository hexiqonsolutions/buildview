import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Columns2, Loader2 } from "lucide-react";
import { getComparisonProjectsData, listSavedComparisons } from "@/lib/actions/comparison";
import { getCurrentUser } from "@/lib/actions/auth";
import { getPortalWorkspaceBootstrap } from "@/lib/actions/data";
import { CompareProgressHub } from "@/components/compare/compare-progress-hub";
import { IntelPage } from "@/components/intel/pages/intel-page";

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
    <IntelPage
      title="Compare Progress"
      description="Compare any two site visits and understand how the project has changed."
      icon={Columns2}
      eyebrow="Matterport"
    >
      <Suspense
        fallback={
          <div className="intel-card flex justify-center py-20">
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
    </IntelPage>
  );
}
