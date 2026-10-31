import { DemoShell } from "@/components/experience/demo-shell";
import { PortfolioShowcase } from "@/components/experience/portfolio-showcase";
import { getInteriorFixture } from "@/fixtures/interior";

export const metadata = {
  title: "Interior Portfolio Demo | BuildView Experience",
  robots: { index: false, follow: false },
};

export default function InteriorDemoPage() {
  const data = getInteriorFixture();
  return (
    <DemoShell
      mode="portfolio"
      basePath="/interior"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <PortfolioShowcase data={data} basePath="/interior" />
    </DemoShell>
  );
}
