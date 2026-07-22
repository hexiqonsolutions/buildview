"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  File,
  FolderOpen,
  Grid3X3,
  List,
  Search,
} from "lucide-react";
import { useAdminWorkspace } from "@/components/admin/workspace/admin-workspace-provider";
import { matchesSpatialScope } from "@/lib/admin/scope";
import { DocumentVersionPanel } from "@/components/admin/documents/document-version-panel";
import { DocumentCard } from "@/components/documents/document-card";
import { CreateDocumentForm } from "@/components/admin/create-document-form";
import { CreateFolderForm } from "@/components/admin/create-folder-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentFolder, Project } from "@/lib/types";

type FolderFilter = "all" | "unfiled" | string;
type ViewMode = "list" | "grid";

type FolderNode = DocumentFolder & { children: FolderNode[] };

type DocumentRow = Document & { project?: { name: string; id?: string } | null };
type FolderRow = DocumentFolder & { project?: { name: string; id?: string } | null };

function buildFolderTree(folders: DocumentFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface DocumentManagerProps {
  documents: DocumentRow[];
  folders: FolderRow[];
  projects: Project[];
}

export function DocumentManager({ documents, folders, projects }: DocumentManagerProps) {
  const { hydrated, scope, clientProjects, project } = useAdminWorkspace();
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [versionDoc, setVersionDoc] = useState<DocumentRow | null>(null);

  const scopedProjectIds = useMemo(() => {
    if (scope.projectId) return new Set([scope.projectId]);
    if (scope.clientId) return new Set(clientProjects.map((p) => p.id));
    return new Set(projects.map((p) => p.id));
  }, [scope, clientProjects, projects]);

  const scopedDocuments = useMemo(() => {
    return documents.filter((d) =>
      matchesSpatialScope(d, scope, scopedProjectIds)
    );
  }, [documents, scope, scopedProjectIds]);

  const scopedFolders = useMemo(() => {
    if (!scope.clientId && !scope.projectId) return folders;
    const ids = scopedProjectIds;
    return folders.filter((f) => ids.has(f.project_id));
  }, [folders, scope, scopedProjectIds]);

  const folderTree = useMemo(() => buildFolderTree(scopedFolders), [scopedFolders]);

  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    scopedFolders.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [scopedFolders]);

  const filteredDocuments = useMemo(() => {
    let list = scopedDocuments;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const haystack = [d.name, d.file_name, d.category, d.project?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (selectedFolder === "all") return list;
    if (selectedFolder === "unfiled") return list.filter((d) => !d.folder_id);
    return list.filter((d) => d.folder_id === selectedFolder);
  }, [scopedDocuments, selectedFolder, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scopedDocuments.length, unfiled: 0 };
    scopedFolders.forEach((f) => {
      c[f.id] = 0;
    });
    scopedDocuments.forEach((d) => {
      if (d.folder_id && c[d.folder_id] !== undefined) c[d.folder_id]++;
      else if (!d.folder_id) c.unfiled++;
    });
    return c;
  }, [scopedFolders, scopedDocuments]);

  const uploadProjects = scope.projectId
    ? projects.filter((p) => p.id === scope.projectId)
    : scope.clientId
      ? projects.filter((p) => clientProjects.some((cp) => cp.id === p.id))
      : projects;

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
  }

  function renderFolderNode(node: FolderNode, depth = 0) {
    const isSelected = selectedFolder === node.id;
    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => setSelectedFolder(node.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            isSelected
              ? "bg-brand-accent/10 font-medium text-brand-accent"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-xs text-slate-400">{counts[node.id] ?? 0}</span>
        </button>
        {node.children.map((child) => renderFolderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5",
                viewMode === "list" ? "bg-slate-100 dark:bg-slate-800" : "text-slate-400"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5",
                viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800" : "text-slate-400"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
          <CreateFolderForm
            projects={uploadProjects}
            folders={scopedFolders}
          />
          <CreateDocumentForm projects={uploadProjects} />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {filteredDocuments.length} file{filteredDocuments.length === 1 ? "" : "s"}
        {project ? ` · ${project.name}` : scope.clientId ? " in workspace" : ""}
      </p>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-60">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Folders
          </p>
          <nav className="ops-card space-y-1 p-2">
            <button
              type="button"
              onClick={() => setSelectedFolder("all")}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                selectedFolder === "all"
                  ? "bg-brand-accent/10 font-medium text-brand-accent"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <ChevronRight className="h-4 w-4" />
              All Files
              <span className="ml-auto text-xs text-slate-400">{counts.all}</span>
            </button>
            {(counts.unfiled ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setSelectedFolder("unfiled")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  selectedFolder === "unfiled"
                    ? "bg-brand-accent/10 font-medium text-brand-accent"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                <File className="h-4 w-4" />
                Unfiled
                <span className="ml-auto text-xs text-slate-400">{counts.unfiled}</span>
              </button>
            )}
            {folderTree.map((node) => renderFolderNode(node))}
          </nav>
        </div>

        <div className="min-w-0 flex-1">
          {filteredDocuments.length === 0 ? (
            <div className="ops-card flex min-h-[280px] flex-col items-center justify-center p-10 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-900 dark:text-white">No documents here</p>
              <p className="mt-1 text-sm text-slate-500">
                Upload drawings, BOQs, contracts, and technical files.
              </p>
              <div className="mt-4">
                <CreateDocumentForm projects={uploadProjects} />
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="ops-card p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <File className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="mt-3 truncate text-sm font-medium text-slate-900 dark:text-white">
                    {doc.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {doc.project?.name}
                    {doc.folder_id ? ` · ${folderNameMap.get(doc.folder_id)}` : ""}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {formatDate(doc.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <DocumentCard
                      document={doc}
                      projectName={doc.project?.name}
                      folderName={doc.folder_id ? folderNameMap.get(doc.folder_id) : undefined}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setVersionDoc(doc)}
                  >
                    v{doc.version_number ?? 1}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {versionDoc && (
        <DocumentVersionPanel
          document={versionDoc}
          open={Boolean(versionDoc)}
          onOpenChange={(open) => !open && setVersionDoc(null)}
        />
      )}
    </div>
  );
}
