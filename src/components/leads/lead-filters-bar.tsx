"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  labelize,
} from "@/lib/leads/constants";

type LeadFiltersBarProps = {
  sources: string[];
  industries: string[];
};

export function LeadFiltersBar({ sources, industries }: LeadFiltersBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(
    Boolean(
      searchParams.get("status") ||
        searchParams.get("priority") ||
        searchParams.get("leadSource") ||
        searchParams.get("industry")
    )
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    startTransition(() => {
      router.push(`/leads?${params.toString()}`);
    });
  }

  function setFilter(key: string, value: string | null) {
    pushParams((params) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
  }

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams((params) => {
      if (!q.trim()) params.delete("q");
      else params.set("q", q.trim());
    });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push("/leads"));
  }

  const hasFilters = Boolean(
    searchParams.get("q") ||
      searchParams.get("status") ||
      searchParams.get("priority") ||
      searchParams.get("leadSource") ||
      searchParams.get("industry")
  );

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800/80 bg-[#121212] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={onSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, contact, email, phone, industry…"
            className="pl-10"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={open ? "default" : "secondary"}
            onClick={() => setOpen((value) => !value)}
            className="cursor-pointer"
          >
            <Filter className="size-4" />
            Filters
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={clearAll}
              className="cursor-pointer"
              disabled={pending}
            >
              <X className="size-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            value={searchParams.get("status") ?? "all"}
            onValueChange={(value) => setFilter("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {labelize(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("priority") ?? "all"}
            onValueChange={(value) => setFilter("priority", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {LEAD_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {labelize(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("leadSource") ?? "all"}
            onValueChange={(value) => setFilter("leadSource", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get("industry") ?? "all"}
            onValueChange={(value) => setFilter("industry", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
