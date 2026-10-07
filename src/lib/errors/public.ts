/**
 * Shared by server and client code.
 *
 * Next.js replaces the message of any error thrown from a Server Action or
 * Server Component with a generic placeholder in production, but forwards the
 * error's `digest` untouched. `PublicError` stores its (user-safe) message in
 * the digest so the client can recover it; logged internal failures store a
 * support reference instead. Everything else is shown as the caller's fallback.
 */
const PUBLIC_DIGEST_PREFIX = "BV_PUBLIC:";
export const INTERNAL_DIGEST_PREFIX = "BV_INTERNAL:";

/** An error whose message is written for end users and is safe to display. */
export class PublicError extends Error {
  readonly digest: string;

  constructor(message: string) {
    super(message);
    this.name = "PublicError";
    this.digest = PUBLIC_DIGEST_PREFIX + encodeURIComponent(message);
  }
}

function digestOf(err: unknown): string | null {
  if (err && typeof err === "object" && "digest" in err) {
    const { digest } = err as { digest: unknown };
    if (typeof digest === "string") return digest;
  }
  return null;
}

function withRef(message: string, ref: string): string {
  return `${message.replace(/[.!]?$/, ".")} (Ref: ${ref})`;
}

function decodePublicMessage(digest: string): string | null {
  try {
    return decodeURIComponent(digest.slice(PUBLIC_DIGEST_PREFIX.length)) || null;
  } catch {
    return null;
  }
}

/**
 * Returns a message that is safe to show the user: the text of a `PublicError`
 * (including one thrown by a Server Action), otherwise `fallback` — with a
 * support reference when the server logged the failure. Raw database, storage,
 * network and runtime errors never reach the UI.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof PublicError) return err.message;
  const digest = digestOf(err);
  if (digest?.startsWith(PUBLIC_DIGEST_PREFIX)) {
    return decodePublicMessage(digest) ?? fallback;
  }
  if (digest?.startsWith(INTERNAL_DIGEST_PREFIX)) {
    return withRef(fallback, digest.slice(INTERNAL_DIGEST_PREFIX.length));
  }
  return fallback;
}

/**
 * For error boundaries: like `getErrorMessage`, but also shows the digest Next.js
 * attaches to server render errors, which matches the entry in the server log.
 */
export function getBoundaryMessage(err: unknown, fallback: string): string {
  const digest = digestOf(err);
  if (digest && !digest.startsWith("BV_")) return withRef(fallback, digest);
  return getErrorMessage(err, fallback);
}

/**
 * True for a production-redacted server error that is neither a `PublicError`
 * nor a logged internal failure — typically a failed RSC refresh after the
 * mutation itself succeeded.
 */
export function isUnclassifiedServerError(err: unknown): boolean {
  if (digestOf(err)?.startsWith("BV_")) return false;
  return err instanceof Error && /Server Components render/i.test(err.message);
}
