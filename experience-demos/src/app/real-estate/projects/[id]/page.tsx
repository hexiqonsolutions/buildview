import { notFound } from "next/navigation";
import { DemoShell } from "@/components/experience/demo-shell";
import { ProjectWorkspace } from "@/components/experience/project-workspace";
import { getRealEstateFixture, getRealEstateProject } from "@/fixtures/real-estate";

export const metadata = {
  title: "Real Estate Project | BuildView Experience",
  robots: { index: false, follow: false },
};

export default async function RealEstateProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const project = getRealEstateProject(id);
  if (!project) notFound();
  const data = getRealEstateFixture();

  return (
    <DemoShell
      mode="portfolio"
      basePath="/real-estate"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <ProjectWorkspace
        project={project}
        mode="portfolio"
        backHref="/real-estate"
        initialTab={tab === "scans" ? "walkthroughs" : tab}
      />
    </DemoShell>
  );
}
