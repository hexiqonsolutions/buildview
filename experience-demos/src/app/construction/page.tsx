import { DemoShell } from "@/components/experience/demo-shell";
import { ConstructionOverview } from "@/components/experience/construction-overview";
import { getConstructionFixture } from "@/fixtures/construction";

export const metadata = {
  title: "Construction Intelligence Demo | BuildView Experience",
  robots: { index: false, follow: false },
};

export default function ConstructionDemoPage() {
  const data = getConstructionFixture();
  return (
    <DemoShell
      mode="construction"
      basePath="/construction"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <ConstructionOverview data={data} />
    </DemoShell>
  );
}
