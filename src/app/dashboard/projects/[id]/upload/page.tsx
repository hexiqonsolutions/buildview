import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { getProjectWithClient } from "@/lib/actions/data";
import { getCurrentUser } from "@/lib/actions/auth";
import { canManageClientUploads } from "@/lib/auth/roles";
import { can } from "@/lib/auth/permissions";
import { UploadWizard } from "@/components/admin/upload/upload-wizard";
import { Button } from "@/components/ui/button";

export default async function PortalProjectUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, projectData] = await Promise.all([getCurrentUser(), getProjectWithClient(id)]);

  if (!user) redirect("/login");
  if (!projectData) notFound();

  const allowed =
    canManageClientUploads(user.role) || can(user.role, "upload", "upload");
  if (!allowed) {
    redirect(`/dashboard/projects/${id}?error=unauthorized`);
  }

  const { project } = projectData;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-slate-500">
        <Link href={`/dashboard/projects/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {project.name}
        </Link>
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-slate-500" />
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Upload to project
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Add Matterport scans, reports, documents, photos, timeline updates, and issues for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">{project.name}</span>.
        </p>
      </div>

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}
      >
        <UploadWizard
          mode="portal"
          lockedProjectId={project.id}
          lockedProjectName={project.name}
          projectHref={`/dashboard/projects/${project.id}`}
        />
      </Suspense>
    </div>
  );
}
