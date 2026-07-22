import { Suspense } from "react";
import { getComparisonProjectsData, listSavedComparisons } from "@/lib/actions/comparison";
import { CompareProgressHub } from "@/components/compare/compare-progress-hub";
import { Loader2 } from "lucide-react";

export default async function AdminComparePage() {
  const [initialData, initialSaved] = await Promise.all([
    getComparisonProjectsData(),
    listSavedComparisons(),
  ]);

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
        <CompareProgressHub initialData={initialData} initialSaved={initialSaved} isAdmin />
      </Suspense>
    </div>
  );
}
