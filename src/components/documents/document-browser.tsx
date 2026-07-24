"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FolderOpen, File, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/documents/document-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { cn } from "@/lib/utils";
import type { Document, DocumentFolder } from "@/lib/types";

type FolderFilter = "all" | "unfiled" | string;

interface FolderNode extends DocumentFolder {
  children: FolderNode[];
}

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

interface DocumentBrowserProps {
  folders: DocumentFolder[];
  documents: Document[];
  projectName?: string;
}

export function DocumentBrowser({
  folders,
  documents,
  projectName,
}: DocumentBrowserProps) {
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>("all");

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [folders]);

  const filteredDocuments = useMemo(() => {
    if (selectedFolder === "all") return documents;
    if (selectedFolder === "unfiled") {
      return documents.filter((d) => !d.folder_id);
    }
    return documents.filter((d) => d.folder_id === selectedFolder);
  }, [documents, selectedFolder]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length, unfiled: 0 };
    folders.forEach((f) => {
      c[f.id] = 0;
    });
    documents.forEach((d) => {
      if (d.folder_id && c[d.folder_id] !== undefined) {
        c[d.folder_id]++;
      } else if (!d.folder_id) {
        c.unfiled++;
      }
    });
    return c;
  }, [folders, documents]);

  if (folders.length === 0 && documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents available yet."
        description="Drawings, contracts, and technical documents will appear here."
      />
    );
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

  function folderButton(
    id: FolderFilter,
    label: string,
    count: number,
    icon: ReactNode,
    compact = false
  ) {
    const isSelected = selectedFolder === id;
    return (
      <button
        type="button"
        onClick={() => setSelectedFolder(id)}
        className={cn(
          compact
            ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
            : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          isSelected
            ? compact
              ? "border-brand-accent/30 bg-brand-accent/10 text-brand-accent"
              : "bg-brand-accent/10 font-medium text-brand-accent"
            : compact
              ? "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        )}
      >
        {icon}
        <span className={compact ? undefined : "truncate flex-1"}>{label}</span>
        <span className={cn("text-slate-400", compact ? "text-[10px]" : "text-xs ml-auto")}>
          {count}
        </span>
      </button>
    );
  }

  const mobileFolderOptions: Array<{ id: FolderFilter; label: string; count: number; icon: ReactNode }> = [
    { id: "all", label: "All Files", count: counts.all, icon: <ChevronRight className="h-3.5 w-3.5" /> },
    ...(counts.unfiled > 0
      ? [{ id: "unfiled" as const, label: "Unfiled", count: counts.unfiled, icon: <File className="h-3.5 w-3.5" /> }]
      : []),
    ...folders.map((f) => ({
      id: f.id,
      label: f.name,
      count: counts[f.id] ?? 0,
      icon: <FolderOpen className="h-3.5 w-3.5" />,
    })),
  ];

  return (
    <div className="space-y-4 lg:space-y-0">
      {/* Mobile: compact horizontal folder filter */}
      <div className="lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Folders
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {mobileFolderOptions.map((option) => (
            <span key={String(option.id)} className="contents">
              {folderButton(option.id, option.label, option.count, option.icon, true)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Desktop folder sidebar */}
        <div className="hidden w-full shrink-0 lg:block lg:w-56">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Folders
          </p>
          <nav className="space-y-1 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            {folderButton("all", "All Files", counts.all, <ChevronRight className="h-4 w-4" />)}
            {(counts.unfiled ?? 0) > 0 &&
              folderButton("unfiled", "Unfiled", counts.unfiled, <File className="h-4 w-4" />)}
            {folderTree.map((node) => renderFolderNode(node))}
          </nav>
        </div>

        {/* File list */}
        <div className="min-w-0 flex-1">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 dark:border-slate-700">
            <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No documents in this folder.</p>
            {selectedFolder !== "all" && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => setSelectedFolder("all")}
              >
                View all files
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                projectName={projectName}
                folderName={
                  doc.folder_id ? folderNameMap.get(doc.folder_id) : undefined
                }
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
