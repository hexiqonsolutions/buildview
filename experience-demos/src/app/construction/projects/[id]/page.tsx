import { notFound } from "next/navigation";
import { DemoShell } from "@/components/experience/demo-shell";
import { ProjectWorkspace } from "@/components/experience/project-workspace";
import { getConstructionFixture, getConstructionProject } from "@/fixtures/construction";

export const metadata = {
  title: "Project Workspace | Construction Demo",
  robots: { index: false, follow: false },
};

export default async function ConstructionProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const project = getConstructionProject();
  if (id !== project.id) notFound();
  const data = getConstructionFixture();

  return (
    <DemoShell
      mode="construction"
      basePath="/construction"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <ProjectWorkspace
        project={project}
        mode="construction"
        backHref="/construction"
        compareHref="/construction/compare"
        initialTab={tab}
      />
    </DemoShell>
  );
}
