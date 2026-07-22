import { Suspense } from "react";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import { UploadWizard } from "@/components/admin/upload/upload-wizard";
import { Upload } from "lucide-react";

export default function UploadCenterPage() {
  return (
    <OpsWorkspacePage
      title="Upload Center"
      description="Step through workspace → upload type → details. Timeline, activity logs, and client notifications are created automatically."
      icon={Upload}
      showBanner={false}
    >
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}>
        <UploadWizard />
      </Suspense>
    </OpsWorkspacePage>
  );
}
