import "server-only";

import { getSupabaseUrl } from "@/lib/supabase/env";

export type SupabasePlan = "free" | "pro" | "team" | "enterprise" | "platform";

export type StorageQuota = {
  plan: SupabasePlan | null;
  /** Included storage in bytes, or null when it can't be determined. */
  limitBytes: number | null;
  /** Paid plans keep accepting uploads past the quota and bill the overage. */
  overageBilled: boolean;
  source: "supabase" | "override" | "unknown";
};

const GB = 1024 ** 3;

/** Included file storage per plan (supabase.com/docs/guides/storage/pricing). Enterprise is custom. */
const INCLUDED_STORAGE_BYTES: Partial<Record<SupabasePlan, number>> = {
  free: 1 * GB,
  pro: 100 * GB,
  team: 100 * GB,
};

const MANAGEMENT_API = "https://api.supabase.com/v1";
const PLAN_CACHE_SECONDS = 3600;

function getProjectRef(): string | null {
  try {
    const host = new URL(getSupabaseUrl()).hostname;
    return host.endsWith(".supabase.co") ? host.split(".")[0] : null;
  } catch {
    return null;
  }
}

async function managementGet<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${MANAGEMENT_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: PLAN_CACHE_SECONDS },
  });
  if (!res.ok) {
    console.error(`[supabase-plan] ${path} returned ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

async function fetchPlan(token: string): Promise<SupabasePlan | null> {
  const ref = getProjectRef();
  if (!ref) return null;

  const project = await managementGet<{ organization_slug?: string; organization_id?: string }>(
    `/projects/${ref}`,
    token
  );
  const slug = project?.organization_slug ?? project?.organization_id;
  if (!slug) return null;

  const org = await managementGet<{ plan?: SupabasePlan }>(
    `/organizations/${encodeURIComponent(slug)}`,
    token
  );
  return org?.plan ?? null;
}

/**
 * The project's storage quota from its Supabase plan, read through the
 * Management API (needs SUPABASE_ACCESS_TOKEN). SUPABASE_STORAGE_QUOTA_GB
 * overrides the limit, e.g. for Enterprise contracts.
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  let plan: SupabasePlan | null = null;

  if (token) {
    try {
      plan = await fetchPlan(token);
    } catch (error) {
      console.error("[supabase-plan] plan lookup failed:", error);
    }
  }

  const overageBilled = plan !== null && plan !== "free";
  const overrideGb = Number(process.env.SUPABASE_STORAGE_QUOTA_GB);
  if (Number.isFinite(overrideGb) && overrideGb > 0) {
    return { plan, limitBytes: overrideGb * GB, overageBilled, source: "override" };
  }

  if (!plan) {
    return { plan: null, limitBytes: null, overageBilled: false, source: "unknown" };
  }

  return {
    plan,
    limitBytes: INCLUDED_STORAGE_BYTES[plan] ?? null,
    overageBilled,
    source: "supabase",
  };
}
