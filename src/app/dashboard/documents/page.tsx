import {
  broadPortalListScope,
  getPortalScopedDocuments,
  getPortalScopedFolders,
  getPortalScopedProjects,
  parsePortalWorkspaceScopeFromParams,
} from "@/lib/portal/scope-server";
import { DocumentBrowser } from "@/components/documents/document-browser";
import { IntelPage } from "@/components/intel/pages/intel-page";
import { EmptyState } from "@/components/patterns/page-states";
import { PortalWorkspaceContextStrip } from "@/components/portal/workspace/portal-workspace-context-strip";
import { FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = await parsePortalWorkspaceScopeFromParams(params);
  const listScope = broadPortalListScope(scope);

  const [projects, documents, folders] = await Promise.all([
    getPortalScopedProjects(listScope),
    getPortalScopedDocuments(listScope),
    getPortalScopedFolders(listScope),
  ]);

  const projectDocuments = projects
    .map((project) => ({
      project,
      folders: folders.filter((f) => f.project_id === project.id),
      documents: documents.filter((d) => d.project_id === project.id),
    }))
    .filter((p) => p.documents.length > 0 || p.folders.length > 0);

  const hasDocuments = projectDocuments.some((p) => p.documents.length > 0);

  return (
    <IntelPage
      title="Documents"
      description="Drawings, contracts, BOQs, and project files."
      icon={FolderOpen}
      eyebrow="Project Files"
    >
      <div className="space-y-6">
        <PortalWorkspaceContextStrip noun="Documents" />

        {!hasDocuments ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents in this workspace"
            description="Adjust project or building filters, or check back once files are uploaded by your BuildView team."
            variant="intel"
          />
        ) : (
          <div className="space-y-6">
            {projectDocuments.map(({ project, folders: projectFolders, documents: projectDocs }) => (
              <section key={project.id} className="intel-card p-5">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {project.name}
                </h2>
                <div className="mt-4">
                  <DocumentBrowser
                    folders={projectFolders}
                    documents={projectDocs}
                    projectName={project.name}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </IntelPage>
  );
}
