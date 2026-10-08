import {
  getRateLimitConfig,
  type BackoffPolicyName,
  type WindowPolicyName,
} from "@/lib/rate-limit/config";
import {
  DatabaseRateLimitStore,
  MemoryRateLimitStore,
  ResilientRateLimitStore,
  type RateLimitStore,
} from "@/lib/rate-limit/store";

/** Edge-compatible entry point — safe to import from middleware. */

export type { BackoffPolicyName, WindowPolicyName } from "@/lib/rate-limit/config";

interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface BackoffSubject {
  policy: BackoffPolicyName;
  /** Raw identifier (IP, email, user id). Hashed before storage. */
  identifier: string;
}

const ALLOW: RateLimitDecision = { allowed: true, retryAfterSeconds: 0 };

let store: RateLimitStore | null = null;

function getStore(): RateLimitStore {
  if (store) return store;

  const memory = new MemoryRateLimitStore();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  store =
    getRateLimitConfig().store === "memory" || !url || !serviceRoleKey
      ? memory
      : new ResilientRateLimitStore(new DatabaseRateLimitStore(url, serviceRoleKey), memory);
  return store;
}

async function storageKey(
  kind: "w" | "b",
  policy: string,
  identifier: string
): Promise<string> {
  const data = new TextEncoder().encode(identifier.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `${kind}:${policy}:${hex}`;
}

/** Counts one request against a fixed-window policy. */
export async function consumeRateLimit(
  policyName: WindowPolicyName,
  identifier: string
): Promise<RateLimitDecision> {
  const config = getRateLimitConfig();
  if (!config.enabled) return ALLOW;

  const policy = config.policies[policyName];
  try {
    const result = await getStore().hitWindow(
      await storageKey("w", policyName, identifier),
      policy.limit,
      policy.windowSeconds
    );
    return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
  } catch (error) {
    console.error(`[rate-limit] ${policyName} check failed:`, error);
    return ALLOW;
  }
}

/** Longest wait still imposed on any of the subjects (0 = may proceed). */
export async function getBackoffDelay(subjects: BackoffSubject[]): Promise<number> {
  const config = getRateLimitConfig();
  if (!config.enabled || subjects.length === 0) return 0;

  try {
    const delays = await Promise.all(
      subjects.map(async ({ policy, identifier }) =>
        getStore().backoffStatus(await storageKey("b", policy, identifier))
      )
    );
    return Math.max(0, ...delays);
  } catch (error) {
    console.error("[rate-limit] backoff status failed:", error);
    return 0;
  }
}

/** Records one event for every subject; returns the longest wait now imposed. */
export async function recordBackoffEvent(subjects: BackoffSubject[]): Promise<number> {
  const config = getRateLimitConfig();
  if (!config.enabled || subjects.length === 0) return 0;

  try {
    const delays = await Promise.all(
      subjects.map(async ({ policy, identifier }) =>
        getStore().backoffRecord(
          await storageKey("b", policy, identifier),
          config.policies[policy]
        )
      )
    );
    return Math.max(0, ...delays);
  } catch (error) {
    console.error("[rate-limit] backoff record failed:", error);
    return 0;
  }
}

export async function clearBackoff(subjects: BackoffSubject[]): Promise<void> {
  const config = getRateLimitConfig();
  if (!config.enabled || subjects.length === 0) return;

  try {
    await Promise.all(
      subjects.map(async ({ policy, identifier }) =>
        getStore().reset(await storageKey("b", policy, identifier))
      )
    );
  } catch (error) {
    console.error("[rate-limit] backoff reset failed:", error);
  }
}

/**
 * Client IP from proxy headers. On Vercel, x-forwarded-for is set by the edge
 * network (client-supplied values are overwritten), so its first entry is trusted.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** "45 seconds", "2 minutes", "1 hour" — rounded up so users never retry early. */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    const s = Math.max(Math.ceil(seconds), 1);
    return `${s} second${s === 1 ? "" : "s"}`;
  }
  if (seconds < 3600) {
    const m = Math.ceil(seconds / 60);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  const h = Math.ceil(seconds / 3600);
  return `${h} hour${h === 1 ? "" : "s"}`;
}
