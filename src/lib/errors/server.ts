import "server-only";
import { randomUUID } from "crypto";
import { INTERNAL_DIGEST_PREFIX, PublicError } from "@/lib/errors/public";

type LogContext = Record<string, unknown>;

const DETAIL_KEYS = ["code", "details", "hint", "status", "statusCode", "name"] as const;

function describe(err: unknown): Record<string, unknown> {
  if (err === null || err === undefined) {
    return { message: "Operation returned no data" };
  }
  if (typeof err !== "object") {
    return { message: String(err) };
  }

  const source = err as Record<string, unknown>;
  const out: Record<string, unknown> = {
    message: typeof source.message === "string" ? source.message : String(err),
  };
  for (const key of DETAIL_KEYS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      out[key] = source[key];
    }
  }
  if (err instanceof Error) {
    if (err.stack) out.stack = err.stack;
    if (err.cause !== undefined) out.cause = describe(err.cause);
  }
  return out;
}

/**
 * Writes the full error (message, Postgres code/details/hint, stack) to the
 * server log and returns a short reference that can be shown to the user.
 */
export function logServerError(scope: string, err: unknown, context?: LogContext): string {
  const ref = randomUUID().slice(0, 8);
  console.error(`[${scope}] ref=${ref}`, { ...describe(err), ...(context ? { context } : {}) });
  return ref;
}

/** Thrown in place of a raw failure; carries only the log reference. */
class InternalError extends Error {
  readonly digest: string;

  constructor(
    scope: string,
    readonly ref: string
  ) {
    super(`${scope} failed (ref ${ref})`);
    this.name = "InternalError";
    this.digest = INTERNAL_DIGEST_PREFIX + ref;
  }
}

function withRef(message: string, ref: string): string {
  return `${message.replace(/[.!]?$/, ".")} (Ref: ${ref})`;
}

/**
 * Logs a database/storage/internal failure and returns an error to throw in its
 * place. Clients show their own fallback text plus the log reference.
 */
export function internalError(scope: string, err: unknown, context?: LogContext): Error {
  return new InternalError(scope, logServerError(scope, err, context));
}

/**
 * For actions that return `{ error }` instead of throwing: passes through
 * `PublicError` messages and replaces anything else with `fallback` after
 * logging it.
 */
export function toPublicMessage(scope: string, err: unknown, fallback: string): string {
  if (err instanceof PublicError) return err.message;
  if (err instanceof InternalError) return withRef(fallback, err.ref);
  return withRef(fallback, logServerError(scope, err));
}
