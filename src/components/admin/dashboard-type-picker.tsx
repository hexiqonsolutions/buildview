"use client";

import { Building2, HardHat, Sofa, type LucideIcon } from "lucide-react";
import {
  CLIENT_DASHBOARD_TYPES,
  CLIENT_DASHBOARD_TYPE_DESCRIPTIONS,
  CLIENT_DASHBOARD_TYPE_LABELS,
  type ClientDashboardType,
} from "@/lib/portal/dashboard-type";
import { cn } from "@/lib/utils";

const ICONS: Record<ClientDashboardType, LucideIcon> = {
  construction: HardHat,
  portfolio: Sofa,
  property: Building2,
};

/**
 * Three-way client portal picker. Cards (not a dropdown) so staff can compare
 * what each portal is for before choosing — the choice changes the whole
 * client experience.
 */
export function DashboardTypePicker({
  value,
  onChange,
  disabled = false,
  name,
}: {
  value: ClientDashboardType;
  onChange: (value: ClientDashboardType) => void;
  disabled?: boolean;
  /** Group name for the native radios (keyboard arrow navigation). */
  name: string;
}) {
  return (
    <div role="radiogroup" className="grid gap-2" aria-disabled={disabled || undefined}>
      {CLIENT_DASHBOARD_TYPES.map((type) => {
        const Icon = ICONS[type];
        const selected = value === type;
        return (
          <label
            key={type}
            className={cn(
              "flex min-h-11 items-start gap-3 rounded-lg border p-3 transition-colors",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              selected
                ? "border-brand-accent-dark bg-brand-accent/10 dark:bg-brand-accent/10"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
            )}
          >
            <input
              type="radio"
              name={name}
              value={type}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                selected
                  ? "bg-brand-accent text-slate-950"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              )}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                {CLIENT_DASHBOARD_TYPE_LABELS[type]}
              </span>
              <span className="block text-xs leading-relaxed text-slate-500">
                {CLIENT_DASHBOARD_TYPE_DESCRIPTIONS[type]}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
