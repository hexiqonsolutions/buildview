"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileUp, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { MembershipRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LeadFiltersBar } from "@/components/leads/lead-filters-bar";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { LeadImportDialog } from "@/components/leads/lead-import-dialog";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import type { LeadListItem } from "@/lib/leads/queries";
import { exportLeadsAction } from "@/lib/leads/actions";
import { rowsToCsv, rowsToExcel } from "@/lib/leads/import-export";

type LeadsWorkspaceProps = {
  role: MembershipRole;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  items: LeadListItem[];
  sources: string[];
  industries: string[];
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LeadsWorkspace({
  role,
  total,
  page,
  pageCount,
  items,
  sources,
  industries,
}: LeadsWorkspaceProps) {
  const canWrite = role !== MembershipRole.VIEWER;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<LeadListItem | null>(null);
  const [viewing, setViewing] = useState<LeadListItem | null>(null);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/leads?${params.toString()}`);
  }

  function exportFile(format: "csv" | "xlsx") {
    startTransition(async () => {
      try {
        const filters = Object.fromEntries(searchParams.entries());
        const rows = await exportLeadsAction(filters);
        if (!rows.length) {
          toast.message("Nothing to export");
          return;
        }

        if (format === "csv") {
          const csv = rowsToCsv(rows);
          downloadBlob(
            `buildview-leads-${Date.now()}.csv`,
            new Blob([csv], { type: "text/csv;charset=utf-8" })
          );
        } else {
          const buffer = rowsToExcel(rows);
          downloadBlob(
            `buildview-leads-${Date.now()}.xlsx`,
            new Blob([buffer], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })
          );
        }
        toast.success(`Exported ${rows.length} leads`);
      } catch (error) {
        console.error(error);
        toast.error("Export failed");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-5 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
            Lead management
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            {total} construction leads
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Search, filter, import, export, and update pipeline in bulk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <>
              <Button
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setImportOpen(true)}
              >
                <FileUp className="size-4" />
                Import
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Add lead
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={pending}
            onClick={() => exportFile("csv")}
          >
            <Download className="size-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={pending}
            onClick={() => exportFile("xlsx")}
          >
            <Download className="size-4" />
            Excel
          </Button>
        </div>
      </div>

      <LeadFiltersBar sources={sources} industries={industries} />

      {total === 0 && !searchParams.toString() ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121212] px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            Add your first construction lead
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Import a CSV/Excel list or create a lead manually to start filling
            the pipeline and dashboard.
          </p>
          {canWrite ? (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setImportOpen(true)}
              >
                Import file
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                Add lead
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <LeadsTable
            data={items}
            canWrite={canWrite}
            onEdit={setEditing}
            onView={setViewing}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                className="cursor-pointer"
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
                className="cursor-pointer"
                onClick={() => goToPage(page + 1)}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <LeadFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        canWrite={canWrite}
      />
      <LeadFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        lead={editing}
        canWrite={canWrite}
      />
      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <LeadDetailDialog
        lead={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onEdit={setEditing}
        canWrite={canWrite}
      />
    </div>
  );
}
