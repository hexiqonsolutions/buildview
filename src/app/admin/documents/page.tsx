import { FolderOpen } from "lucide-react";
import { getProjects } from "@/lib/actions/data";
import {
  getScopedDocuments,
  getScopedFolders,
  parseWorkspaceScopeFromParams,
} from "@/lib/admin/scope-server";
import { DocumentManager } from "@/components/admin/documents/document-manager";
import { OpsWorkspacePage } from "@/components/admin/ops/ops-workspace-page";
import type { Document, DocumentFolder } from "@/lib/types";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parseWorkspaceScopeFromParams(params);

  const [documents, folders, projects] = await Promise.all([
    getScopedDocuments(scope),
    getScopedFolders(scope),
    getProjects(),
  ]);

  return (
    <OpsWorkspacePage
      title="Document Manager"
      description="Google Drive-style folder browser for drawings, BOQs, contracts, and technical files across the workspace."
      icon={FolderOpen}
    >
      <DocumentManager
        documents={documents as (Document & { project?: { name: string } })[]}
        folders={folders as (DocumentFolder & { project?: { name: string } })[]}
        projects={projects}
      />
    </OpsWorkspacePage>
  );
}
