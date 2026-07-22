import { notFound } from "next/navigation";
import { getClientDetail } from "@/lib/actions/data";
import { ClientWorkspaceTabs } from "@/components/admin/clients/client-workspace-tabs";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  return (
    <ClientWorkspaceTabs
      client={detail.client}
      projects={detail.projects}
      users={detail.users}
      tours={detail.tours}
      reports={detail.reports}
      documents={detail.documents}
      invoices={detail.invoices}
      issues={detail.issues}
      timeline={detail.timeline}
    />
  );
}
