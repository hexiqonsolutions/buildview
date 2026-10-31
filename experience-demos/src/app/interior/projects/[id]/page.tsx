import { notFound } from "next/navigation";
import { DemoShell } from "@/components/experience/demo-shell";
import { ProjectWorkspace } from "@/components/experience/project-workspace";
import { getInteriorFixture, getInteriorProject } from "@/fixtures/interior";

export const metadata = {
  title: "Interior Project | BuildView Experience",
  robots: { index: false, follow: false },
};

export default async function InteriorProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const project = getInteriorProject(id);
  if (!project) notFound();
  const data = getInteriorFixture();

  return (
    <DemoShell
      mode="portfolio"
      basePath="/interior"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <ProjectWorkspace
        project={project}
        mode="portfolio"
        backHref="/interior"
        initialTab={tab === "scans" ? "walkthroughs" : tab}
      />
    </DemoShell>
  );
}
