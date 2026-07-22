import { DashboardMetricCard } from "@/components/shared/dashboard-metric-card";

export function PortalMetricCard(
  props: React.ComponentProps<typeof DashboardMetricCard>
) {
  return <DashboardMetricCard {...props} variant="intel" />;
}
