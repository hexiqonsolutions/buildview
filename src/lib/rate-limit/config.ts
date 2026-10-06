/**
 * Rate-limit policies. Every threshold has a default here and can be overridden
 * without a code change, in increasing priority:
 *
 *   1. RATE_LIMIT_POLICIES — JSON, e.g. {"authLoginAccount":{"freeAttempts":3}}
 *   2. RATE_LIMIT_<POLICY>_<FIELD> — e.g. RATE_LIMIT_AUTH_LOGIN_ACCOUNT_FREE_ATTEMPTS=3
 *
 * Global switches: RATE_LIMIT_ENABLED=false disables all limits,
 * RATE_LIMIT_STORE=memory skips the database (single-instance/dev only).
 *
 * Must stay Edge-compatible: imported by middleware.
 */

/** Fixed window: at most `limit` requests per `windowSeconds`. */
export interface WindowPolicy {
  kind: "window";
  limit: number;
  windowSeconds: number;
}

/**
 * Exponential backoff instead of a hard lockout: the first `freeAttempts`
 * events are free, then each further event doubles the required wait
 * (baseDelaySeconds, 2×, 4×, … capped at maxDelaySeconds). The count is
 * forgotten after `resetAfterSeconds` without new events.
 */
export interface BackoffPolicy {
  kind: "backoff";
  freeAttempts: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  resetAfterSeconds: number;
}

export type RateLimitPolicy = WindowPolicy | BackoffPolicy;

const window = (limit: number, windowSeconds: number): WindowPolicy => ({
  kind: "window",
  limit,
  windowSeconds,
});

const backoff = (
  freeAttempts: number,
  baseDelaySeconds: number,
  maxDelaySeconds: number,
  resetAfterSeconds: number
): BackoffPolicy => ({
  kind: "backoff",
  freeAttempts,
  baseDelaySeconds,
  maxDelaySeconds,
  resetAfterSeconds,
});

const DEFAULT_POLICIES = {
  // Auth — strict. Login counts failed attempts only; the others count every attempt.
  authLoginIp: backoff(20, 30, 1800, 3600),
  authLoginAccount: backoff(5, 30, 900, 3600),
  authSignupIp: backoff(5, 60, 3600, 3600),
  authSignupAccount: backoff(3, 60, 3600, 3600),
  authPasswordResetIp: backoff(5, 60, 3600, 3600),
  authPasswordResetAccount: backoff(3, 120, 3600, 3600),
  authPasswordUpdateIp: backoff(10, 30, 900, 3600),
  authPasswordUpdateAccount: backoff(5, 30, 900, 3600),
  authOauthIp: backoff(10, 15, 600, 1800),

  // Public, per IP — moderate.
  publicApi: window(60, 60),
  publicAction: window(30, 60),
  publicContact: window(5, 600),
  publicAuthCallback: window(20, 300),

  // Signed-in users, per account — loose.
  authenticated: window(300, 60),
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof DEFAULT_POLICIES;

type PoliciesOfKind<K extends RateLimitPolicy["kind"]> = {
  [P in RateLimitPolicyName]: (typeof DEFAULT_POLICIES)[P]["kind"] extends K
    ? P
    : never;
}[RateLimitPolicyName];

export type WindowPolicyName = PoliciesOfKind<"window">;
export type BackoffPolicyName = PoliciesOfKind<"backoff">;

export interface RateLimitConfig {
  enabled: boolean;
  store: "database" | "memory";
  policies: { [P in RateLimitPolicyName]: (typeof DEFAULT_POLICIES)[P] };
}

const FIELD_ENV_SUFFIX = {
  limit: "LIMIT",
  windowSeconds: "WINDOW_SECONDS",
  freeAttempts: "FREE_ATTEMPTS",
  baseDelaySeconds: "BASE_DELAY_SECONDS",
  maxDelaySeconds: "MAX_DELAY_SECONDS",
  resetAfterSeconds: "RESET_AFTER_SECONDS",
} as const;

function toEnvSegment(policyName: string): string {
  return policyName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

/** Env var that overrides one policy field, e.g. RATE_LIMIT_PUBLIC_API_LIMIT. */
export function policyEnvVar(
  policyName: RateLimitPolicyName,
  field: keyof typeof FIELD_ENV_SUFFIX
): string {
  return `RATE_LIMIT_${toEnvSegment(policyName)}_${FIELD_ENV_SUFFIX[field]}`;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

function parseCount(raw: unknown, source: string): number | undefined {
  if (raw === undefined) return undefined;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(`[rate-limit] ignoring invalid value for ${source}: ${String(raw)}`);
    return undefined;
  }
  return Math.floor(value);
}

function parseJsonOverrides(): Record<string, Record<string, unknown>> {
  const raw = readEnv("RATE_LIMIT_POLICIES");
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, Record<string, unknown>>;
    }
  } catch {
    // fall through
  }
  console.warn("[rate-limit] RATE_LIMIT_POLICIES is not a JSON object; ignoring it");
  return {};
}

function resolvePolicy<T extends RateLimitPolicy>(
  name: RateLimitPolicyName,
  defaults: T,
  jsonOverrides: Record<string, unknown> | undefined
): T {
  const resolved: RateLimitPolicy = { ...defaults };
  const fields = Object.keys(defaults).filter(
    (key): key is keyof typeof FIELD_ENV_SUFFIX => key in FIELD_ENV_SUFFIX
  );

  for (const field of fields) {
    const envName = policyEnvVar(name, field);
    const value =
      parseCount(readEnv(envName), envName) ??
      parseCount(jsonOverrides?.[field], `RATE_LIMIT_POLICIES.${name}.${field}`);
    if (value !== undefined) {
      (resolved as unknown as Record<string, number>)[field] = value;
    }
  }

  if (resolved.kind === "window") {
    resolved.limit = Math.max(resolved.limit, 1);
    resolved.windowSeconds = Math.max(resolved.windowSeconds, 1);
  } else {
    resolved.baseDelaySeconds = Math.max(resolved.baseDelaySeconds, 1);
    resolved.maxDelaySeconds = Math.max(resolved.maxDelaySeconds, resolved.baseDelaySeconds);
    // Forgetting failures before the longest delay elapses would undo the backoff.
    resolved.resetAfterSeconds = Math.max(resolved.resetAfterSeconds, resolved.maxDelaySeconds);
  }

  return resolved as T;
}

let cached: RateLimitConfig | null = null;

export function getRateLimitConfig(): RateLimitConfig {
  if (cached) return cached;

  const jsonOverrides = parseJsonOverrides();
  const policies = {} as Record<RateLimitPolicyName, RateLimitPolicy>;
  for (const name of Object.keys(DEFAULT_POLICIES) as RateLimitPolicyName[]) {
    policies[name] = resolvePolicy(name, DEFAULT_POLICIES[name], jsonOverrides[name]);
  }

  cached = {
    enabled: readEnv("RATE_LIMIT_ENABLED")?.toLowerCase() !== "false",
    store: readEnv("RATE_LIMIT_STORE")?.toLowerCase() === "memory" ? "memory" : "database",
    policies: policies as RateLimitConfig["policies"],
  };
  return cached;
}
