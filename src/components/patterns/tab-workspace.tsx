"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type TabWorkspaceItem = {
  id: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
};

export const TAB_PARAM = "tab";

interface TabWorkspaceProps {
  tabs: TabWorkspaceItem[];
  defaultTab?: string;
  /** @deprecated Variants are unified — kept for backward compatibility */
  variant?: "ops" | "intel";
  className?: string;
  children: React.ReactNode;
}

/**
 * URL-synced tab workspace — preserves existing search params (workspace scope, etc.)
 * Uses the same pill style across admin and client dashboards.
 */
export function TabWorkspace({
  tabs,
  defaultTab,
  className,
  children,
}: TabWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(() => {
    const fromUrl = searchParams.get(TAB_PARAM);
    if (fromUrl && tabs.some((t) => t.id === fromUrl && !t.disabled)) return fromUrl;
    return defaultTab ?? tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id ?? "overview";
  }, [searchParams, tabs, defaultTab]);

  const onTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(TAB_PARAM, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className={cn("w-full", className)}>
      <TabsList className="dashboard-tabs-list grid h-auto w-full grid-cols-3 items-stretch sm:flex sm:flex-wrap sm:items-center">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="dashboard-tabs-trigger min-h-11 w-full justify-center px-2 py-2 text-[11px] leading-tight sm:min-h-9 sm:w-auto sm:px-3 sm:py-1.5 sm:text-sm"
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1.5 text-[10px] opacity-70">({tab.badge})</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

export { TabsContent as TabPanel };
