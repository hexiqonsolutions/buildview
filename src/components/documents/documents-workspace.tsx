"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { DocumentType, MembershipRole } from "@prisma/client";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { deleteDocumentAction } from "@/lib/documents/actions";
import type { DocumentListItem } from "@/lib/documents/queries";
import {
  DOCUMENT_TYPES,
  formatBytes,
  type DocumentFilter,
} from "@/lib/documents/schema";

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
};

type DocumentsWorkspaceProps = {
  role: MembershipRole;
  filter: DocumentFilter;
  items: DocumentListItem[];
  counts: Record<DocumentType | "all", number>;
  leads: LeadOption[];
};

const TYPE_META: Record<
  DocumentType,
  {
    label: string;
    badge: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
    icon: typeof FileText;
  }
> = {
  PDF: { label: "PDF", badge: "danger", icon: FileText },
  PROPOSAL: { label: "Proposal", badge: "default", icon: FileText },
  QUOTATION: { label: "Quotation", badge: "warning", icon: FileSpreadsheet },
  CONTRACT: { label: "Contract", badge: "success", icon: FileText },
  INVOICE: { label: "Invoice", badge: "outline", icon: FileSpreadsheet },
  IMAGE: { label: "Image", badge: "secondary", icon: FileImage },
  OTHER: { label: "Other", badge: "secondary", icon: File },
};

const FILTERS: { id: DocumentFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...DOCUMENT_TYPES.map((type) => ({
    id: type as DocumentFilter,
    label: TYPE_META[type].label,
  })),
];

export function DocumentsWorkspace({
  role,
  filter,
  items,
  counts,
  leads,
}: DocumentsWorkspaceProps) {
  const canWrite = role !== MembershipRole.VIEWER;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentListItem | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const defaultLeadId = searchParams.get("leadId") || undefined;

  useEffect(() => {
    if (defaultLeadId) setCreateOpen(true);
  }, [defaultLeadId]);

  function setFilter(next: DocumentFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("type");
    else params.set("type", next);
    router.push(`/documents?${params.toString()}`);
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    router.push(`/documents?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
            Documents
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            {counts.all} files in library
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Proposals, quotations, contracts, and PDFs linked to leads.
          </p>
        </div>
        {canWrite ? (
          <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Upload document
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-[#121212] p-4 lg:flex-row lg:items-center">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="pl-10"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span className="ml-1 tabular-nums text-[11px] opacity-70">
                {counts[item.id]}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121212] px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            No documents yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Upload a proposal or quotation and link it to a lead.
          </p>
          {canWrite ? (
            <Button
              className="mt-6 cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              Upload document
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#121212]">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_minmax(0,1fr)_120px_auto] gap-3 border-b border-zinc-800 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 md:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Lead</span>
            <span>Size</span>
            <span>Uploaded by</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-zinc-800/80">
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <li
                  key={item.id}
                  className="grid gap-3 px-4 py-4 transition-colors hover:bg-zinc-900/40 md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_100px_minmax(0,1fr)_120px_auto] md:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {item.mimeType}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>
                  <p className="truncate text-sm text-zinc-400">
                    {item.lead
                      ? `${item.lead.contactName} · ${item.lead.company}`
                      : "—"}
                  </p>
                  <p className="tabular-nums text-sm text-zinc-400">
                    {formatBytes(item.sizeBytes)}
                  </p>
                  <p className="truncate text-sm text-zinc-400">
                    {item.uploadedBy
                      ? item.uploadedBy.fullName || item.uploadedBy.email
                      : "—"}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild size="sm" variant="secondary" className="cursor-pointer">
                      <a href={`/api/documents/${item.id}/download`}>
                        <Download className="size-4" />
                        Download
                      </a>
                    </Button>
                    {canWrite ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => setEditing(item)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteDocumentAction(item.id);
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Document removed");
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <DocumentFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && defaultLeadId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("leadId");
            router.replace(`/documents?${params.toString()}`);
          }
        }}
        leads={leads}
        canWrite={canWrite}
        defaultLeadId={defaultLeadId}
      />
      <DocumentFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        leads={leads}
        document={editing}
        canWrite={canWrite}
      />
    </div>
  );
}
