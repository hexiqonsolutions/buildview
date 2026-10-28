"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Loader2, Search } from "lucide-react";
import {
  listAllTourShareViewers,
  type TourShareViewerAdminRow,
} from "@/lib/actions/tour-shares";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

function toCsv(rows: TourShareViewerAdminRow[]): string {
  const header = ["Name", "Phone", "Email", "Project", "Tour", "Opened at", "Share status"];
  const lines = rows.map((row) =>
    [
      row.viewerName,
      row.viewerPhone ?? "",
      row.viewerEmail ?? "",
      row.projectName,
      row.tourName,
      row.createdAt,
      row.shareRevokedAt
        ? "Revoked"
        : new Date(row.shareExpiresAt).getTime() < Date.now()
          ? "Expired"
          : "Active",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function TourViewersTable({
  initialRows,
  projects,
}: {
  initialRows: TourShareViewerAdminRow[];
  projects: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string>("all");
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const next = await listAllTourShareViewers({
        query: query.trim() || null,
        projectId: projectId === "all" ? null : projectId,
        limit: 500,
      });
      setRows(next);
    });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buildview-tour-viewers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summary = useMemo(
    () => `${rows.length} viewer${rows.length === 1 ? "" : "s"}`,
    [rows.length]
  );

  return (
    <div className="space-y-4">
      <div className="ops-card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search name, phone, email, project, tour…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") refresh();
              }}
            />
          </div>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="button" onClick={refresh} disabled={pending} className="flex-1">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{summary}</p>
      </div>

      {rows.length === 0 ? (
        <div className="ops-card px-4 py-10 text-center text-sm text-slate-500">
          No viewer details yet. When someone opens a shared tour link and enters their name,
          phone, and email, they will appear here.
        </div>
      ) : (
        <div className="ops-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Tour</th>
                  <th className="px-4 py-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {row.viewerName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {row.viewerPhone ? (
                        <a
                          href={`tel:${row.viewerPhone.replace(/\s/g, "")}`}
                          className="hover:underline"
                        >
                          {row.viewerPhone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {row.viewerEmail ? (
                        <a href={`mailto:${row.viewerEmail}`} className="hover:underline">
                          {row.viewerEmail}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.projectName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.tourName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
