import { DemoShell } from "@/components/experience/demo-shell";
import { PortfolioShowcase } from "@/components/experience/portfolio-showcase";
import { getRealEstateFixture } from "@/fixtures/real-estate";

export const metadata = {
  title: "Real Estate Portfolio Demo | BuildView Experience",
  robots: { index: false, follow: false },
};

export default function RealEstateDemoPage() {
  const data = getRealEstateFixture();
  return (
    <DemoShell
      mode="portfolio"
      basePath="/real-estate"
      clientName={data.clientName}
      firstName={data.firstName}
      fullName={data.fullName}
    >
      <PortfolioShowcase data={data} basePath="/real-estate" />
    </DemoShell>
  );
}
