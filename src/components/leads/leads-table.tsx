"use client";

import { useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { LeadPriority, LeadStatus } from "@prisma/client";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  PRIORITY_BADGE,
  STATUS_BADGE,
  labelize,
} from "@/lib/leads/constants";
import type { LeadListItem } from "@/lib/leads/queries";
import { bulkUpdateLeadsAction } from "@/lib/leads/actions";

type LeadsTableProps = {
  data: LeadListItem[];
  canWrite: boolean;
  onEdit: (lead: LeadListItem) => void;
  onView: (lead: LeadListItem) => void;
};

function money(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadsTable({ data, canWrite, onEdit, onView }: LeadsTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pending, startTransition] = useTransition();
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkPriority, setBulkPriority] = useState<string>("");

  const columns = useMemo<ColumnDef<LeadListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label="Select all"
            disabled={!canWrite}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Select row"
            disabled={!canWrite}
            onClick={(event) => event.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 36,
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <div className="min-w-[160px]">
            <p className="font-medium text-white">{row.original.company}</p>
            <p className="text-xs text-zinc-500">
              {row.original.location || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "contactName",
        header: "Contact",
        cell: ({ row }) => (
          <div className="min-w-[140px]">
            <p>{row.original.contactName}</p>
            <p className="text-xs text-zinc-500">
              {row.original.designation || "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-zinc-300">{row.original.email || "—"}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={STATUS_BADGE[row.original.status as LeadStatus] ?? "secondary"}
          >
            {labelize(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge
            variant={
              PRIORITY_BADGE[row.original.priority as LeadPriority] ?? "outline"
            }
          >
            {labelize(row.original.priority)}
          </Badge>
        ),
      },
      {
        accessorKey: "leadSource",
        header: "Source",
        cell: ({ row }) => row.original.leadSource || "—",
      },
      {
        accessorKey: "expectedRevenue",
        header: "Expected",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {money(row.original.expectedRevenue)}
          </span>
        ),
      },
      {
        accessorKey: "nextFollowUpAt",
        header: "Follow-up",
        cell: ({ row }) =>
          row.original.nextFollowUpAt
            ? format(new Date(row.original.nextFollowUpAt), "MMM d, yyyy")
            : "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => onView(row.original)}
              aria-label="View lead"
            >
              <Eye className="size-4" />
            </Button>
            {canWrite ? (
              <Button
                size="icon"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => onEdit(row.original)}
                aria-label="Edit lead"
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canWrite, onEdit, onView]
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: canWrite,
  });

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id);

  function runBulk(payload: {
    status?: LeadStatus;
    priority?: LeadPriority;
    softDelete?: boolean;
  }) {
    if (!selectedIds.length) return;
    startTransition(async () => {
      const result = await bulkUpdateLeadsAction({
        ids: selectedIds,
        ...payload,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        payload.softDelete
          ? `Deleted ${result.data?.count ?? 0} leads`
          : `Updated ${result.data?.count ?? 0} leads`
      );
      setRowSelection({});
      setBulkStatus("");
      setBulkPriority("");
    });
  }

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-orange-100">
            {selectedIds.length} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={bulkStatus || undefined}
              onValueChange={(value) => {
                setBulkStatus(value);
                runBulk({ status: value as LeadStatus });
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelize(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={bulkPriority || undefined}
              onValueChange={(value) => {
                setBulkPriority(value);
                runBulk({ priority: value as LeadPriority });
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Set priority" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {labelize(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              disabled={pending}
              className="cursor-pointer"
              onClick={() => runBulk({ softDelete: true })}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800/80 bg-[#121212]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => onView(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-500"
                >
                  No leads match these filters. Clear filters or add a new lead.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
