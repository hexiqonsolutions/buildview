"use client";

import { useMemo, useState } from "react";
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Folder sidebar */}
      <div className="w-full shrink-0 lg:w-56">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Folders
        </p>
        <nav className="space-y-1 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
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
  );
}
