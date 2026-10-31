import { DemoShell } from "@/components/experience/demo-shell";
import { CompareView } from "@/components/experience/compare-view";
import {
  CONSTRUCTION_COMPARE,
  getConstructionFixture,
  getConstructionProject,
} from "@/fixtures/construction";

export const metadata = {
  title: "Scan Compare | Construction Demo",
  robots: { index: false, follow: false },
};

export default function ConstructionComparePage() {
  const data = getConstructionFixture();
  const project = getConstructionProject();
  const scanA = project.tours.find((t) => t.id === CONSTRUCTION_COMPARE.scanAId)!;
  const scanB = project.tours.find((t) => t.id === CONSTRUCTION_COMPARE.scanBId)!;

  return (
    <DemoShell
      mode="construction"
      basePath="/construction"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <CompareView
        projectName={project.name}
        projectHref={`/construction/projects/${project.id}?tab=scans`}
        scanA={scanA}
        scanB={scanB}
      />
    </DemoShell>
  );
}
