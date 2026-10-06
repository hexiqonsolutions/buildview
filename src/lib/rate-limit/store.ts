import type { BackoffPolicy } from "@/lib/rate-limit/config";

/** Edge-compatible counter storage (used from middleware and server actions). */

export interface WindowResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  hitWindow(key: string, limit: number, windowSeconds: number): Promise<WindowResult>;
  /** Seconds the caller must still wait under a backoff key (0 = clear). */
  backoffStatus(key: string): Promise<number>;
  /** Registers one event; returns the wait now imposed (0 = none yet). */
  backoffRecord(key: string, policy: BackoffPolicy): Promise<number>;
  reset(key: string): Promise<void>;
}

function backoffDelaySeconds(events: number, policy: BackoffPolicy): number {
  if (events < policy.freeAttempts) return 0;
  const exponent = Math.min(events - policy.freeAttempts, 30);
  return Math.min(policy.baseDelaySeconds * 2 ** exponent, policy.maxDelaySeconds);
}

// ─── In-memory (per instance) ────────────────────────────────────────────────

interface MemoryEntry {
  hits: number;
  windowStart: number;
  blockedUntil: number;
  updatedAt: number;
  expiresAt: number;
}

const MEMORY_MAX_ENTRIES = 10_000;

export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, MemoryEntry>();

  private prune(now: number) {
    if (this.entries.size < MEMORY_MAX_ENTRIES) return;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt < now && entry.blockedUntil < now) this.entries.delete(key);
    }
  }

  async hitWindow(key: string, limit: number, windowSeconds: number): Promise<WindowResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    this.prune(now);

    let entry = this.entries.get(key);
    if (!entry || entry.windowStart + windowMs <= now) {
      entry = { hits: 0, windowStart: now, blockedUntil: 0, updatedAt: now, expiresAt: now + windowMs };
      this.entries.set(key, entry);
    }
    entry.hits += 1;
    entry.updatedAt = now;

    const allowed = entry.hits <= limit;
    return {
      allowed,
      remaining: Math.max(limit - entry.hits, 0),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(Math.ceil((entry.windowStart + windowMs - now) / 1000), 1),
    };
  }

  async backoffStatus(key: string): Promise<number> {
    const entry = this.entries.get(key);
    const now = Date.now();
    if (!entry || entry.blockedUntil <= now) return 0;
    return Math.max(Math.ceil((entry.blockedUntil - now) / 1000), 1);
  }

  async backoffRecord(key: string, policy: BackoffPolicy): Promise<number> {
    const now = Date.now();
    const resetMs = policy.resetAfterSeconds * 1000;
    this.prune(now);

    let entry = this.entries.get(key);
    if (!entry || entry.updatedAt + resetMs <= now) {
      entry = { hits: 0, windowStart: now, blockedUntil: 0, updatedAt: now, expiresAt: now + resetMs };
      this.entries.set(key, entry);
    }
    entry.hits += 1;
    entry.updatedAt = now;
    entry.expiresAt = now + resetMs;

    const delay = backoffDelaySeconds(entry.hits, policy);
    if (delay > 0) entry.blockedUntil = now + delay * 1000;
    return delay;
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key);
  }
}

// ─── Supabase Postgres (shared across instances; migration 028) ──────────────

const RPC_TIMEOUT_MS = 1500;

export class DatabaseRateLimitStore implements RateLimitStore {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string
  ) {}

  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${fn} failed: ${response.status} ${await response.text()}`);
      }
      const text = await response.text();
      return (text ? JSON.parse(text) : null) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async hitWindow(key: string, limit: number, windowSeconds: number): Promise<WindowResult> {
    const result = await this.rpc<{ allowed: boolean; remaining: number; retry_after: number }>(
      "rate_limit_hit",
      { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }
    );
    return {
      allowed: Boolean(result.allowed),
      remaining: Number(result.remaining) || 0,
      retryAfterSeconds: Number(result.retry_after) || 0,
    };
  }

  async backoffStatus(key: string): Promise<number> {
    const result = await this.rpc<{ retry_after: number }>("rate_limit_backoff_status", {
      p_key: key,
    });
    return Number(result?.retry_after) || 0;
  }

  async backoffRecord(key: string, policy: BackoffPolicy): Promise<number> {
    const result = await this.rpc<{ retry_after: number }>("rate_limit_backoff_record", {
      p_key: key,
      p_free_attempts: policy.freeAttempts,
      p_base_delay_seconds: policy.baseDelaySeconds,
      p_max_delay_seconds: policy.maxDelaySeconds,
      p_reset_after_seconds: policy.resetAfterSeconds,
    });
    return Number(result?.retry_after) || 0;
  }

  async reset(key: string): Promise<void> {
    await this.rpc("rate_limit_reset", { p_key: key });
  }
}

// ─── Database with in-memory fallback ────────────────────────────────────────

const CIRCUIT_OPEN_MS = 60_000;

/**
 * Uses the database, but if it is unreachable or migration 028 is missing,
 * falls back to per-instance memory for a minute instead of failing requests.
 */
export class ResilientRateLimitStore implements RateLimitStore {
  private circuitOpenUntil = 0;

  constructor(
    private readonly primary: RateLimitStore,
    private readonly fallback: RateLimitStore
  ) {}

  private async run<T>(op: (store: RateLimitStore) => Promise<T>): Promise<T> {
    if (Date.now() < this.circuitOpenUntil) return op(this.fallback);
    try {
      return await op(this.primary);
    } catch (error) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
      console.error(
        "[rate-limit] database store unavailable; using in-memory limits for 60s:",
        error instanceof Error ? error.message : error
      );
      return op(this.fallback);
    }
  }

  hitWindow(key: string, limit: number, windowSeconds: number) {
    return this.run((store) => store.hitWindow(key, limit, windowSeconds));
  }

  backoffStatus(key: string) {
    return this.run((store) => store.backoffStatus(key));
  }

  backoffRecord(key: string, policy: BackoffPolicy) {
    return this.run((store) => store.backoffRecord(key, policy));
  }

  reset(key: string) {
    return this.run((store) => store.reset(key));
  }
}
