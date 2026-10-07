import "server-only";
import { logServerError } from "@/lib/errors/server";

/** Supabase Auth error codes whose meaning is safe and useful to show users. */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_confirmed: "Please confirm your email address before signing in.",
  user_banned: "This account has been suspended. Contact BuildView support.",
  user_already_exists: "An account with this email already exists. Try signing in instead.",
  email_exists: "An account with this email already exists. Try signing in instead.",
  email_address_invalid: "Enter a valid email address.",
  signup_disabled: "New registrations are currently disabled.",
  weak_password: "This password is too weak or has appeared in a data breach. Please choose a different one.",
  same_password: "Your new password must be different from your current password.",
  over_email_send_rate_limit: "Too many emails have been sent. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  session_expired: "Your session has expired. Please sign in again.",
  session_not_found: "Your session has expired. Please sign in again.",
  reauthentication_needed: "Please sign in again to continue.",
};

/** Maps a Supabase Auth error to a user-safe message; unknown errors are logged and hidden. */
export function authErrorMessage(scope: string, error: unknown, fallback: string): string {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : null;
  const known = code ? AUTH_MESSAGES[code] : undefined;
  if (known) return known;
  logServerError(scope, error);
  return fallback;
}
