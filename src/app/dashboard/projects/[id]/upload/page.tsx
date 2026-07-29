import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { getProjectWithClient } from "@/lib/actions/data";
import { getCurrentUser } from "@/lib/actions/auth";
import { canManageClientUploads } from "@/lib/auth/roles";
import { can } from "@/lib/auth/permissions";
import { UploadWizard } from "@/components/admin/upload/upload-wizard";
import { IntelPage } from "@/components/intel/pages/intel-page";

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
    <IntelPage
      title="Upload to project"
      description={`Add reports, documents, photos, timeline updates, and issues for ${project.name}.`}
      icon={Upload}
      eyebrow="Uploads"
      backHref={`/dashboard/projects/${project.id}`}
      backLabel={`Back to ${project.name}`}
    >
      <Suspense
        fallback={<div className="intel-card h-96 animate-pulse bg-slate-50 dark:bg-slate-900" />}
      >
        <UploadWizard
          mode="portal"
          lockedProjectId={project.id}
          lockedProjectName={project.name}
          projectHref={`/dashboard/projects/${project.id}`}
        />
      </Suspense>
    </IntelPage>
  );
}
