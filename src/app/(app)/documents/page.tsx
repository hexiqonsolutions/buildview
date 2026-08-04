import { Suspense } from "react";
import { DocumentType, MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import {
  getDocumentCounts,
  listDocuments,
  listLeadsForDocument,
} from "@/lib/documents/queries";
import { DOCUMENT_TYPES, type DocumentFilter } from "@/lib/documents/schema";
import { AppTopbar } from "@/components/layout/app-topbar";
import { DocumentsWorkspace } from "@/components/documents/documents-workspace";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const typeParam = first(params.type);
  const filter: DocumentFilter =
    typeParam && DOCUMENT_TYPES.includes(typeParam as DocumentType)
      ? (typeParam as DocumentType)
      : "all";
  const q = first(params.q);
  const leadId = first(params.leadId);

  let items: Awaited<ReturnType<typeof listDocuments>> = [];
  let counts: Record<DocumentType | "all", number> = {
    all: 0,
    PDF: 0,
    PROPOSAL: 0,
    QUOTATION: 0,
    CONTRACT: 0,
    INVOICE: 0,
    IMAGE: 0,
    OTHER: 0,
  };
  let leads: Awaited<ReturnType<typeof listLeadsForDocument>> = [];

  try {
    [items, counts, leads] = await Promise.all([
      listDocuments({
        organizationId: session.organization.id,
        filter,
        q,
        leadId,
      }),
      getDocumentCounts(session.organization.id),
      listLeadsForDocument(session.organization.id),
    ]);
  } catch (error) {
    console.error("Documents page failed:", error);
  }

  return (
    <div>
      <AppTopbar
        title="Documents"
        description={`${counts.all} files · proposals, quotations, contracts, PDFs`}
      />
      <Suspense
        fallback={
          <div className="p-7 text-sm text-zinc-500">Loading documents…</div>
        }
      >
        <DocumentsWorkspace
          role={session.membership.role as MembershipRole}
          filter={filter}
          items={items}
          counts={counts}
          leads={leads}
        />
      </Suspense>
    </div>
  );
}
