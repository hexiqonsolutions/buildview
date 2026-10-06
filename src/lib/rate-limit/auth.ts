import { headers } from "next/headers";
import {
  clearBackoff,
  formatRetryAfter,
  getBackoffDelay,
  getClientIp,
  recordBackoffEvent,
  type BackoffPolicyName,
  type BackoffSubject,
} from "@/lib/rate-limit";

type AuthFlow = "login" | "signup" | "passwordReset" | "passwordUpdate" | "oauth";

const FLOW_POLICIES: Record<
  AuthFlow,
  { ip: BackoffPolicyName; account?: BackoffPolicyName; noun: string }
> = {
  login: { ip: "authLoginIp", account: "authLoginAccount", noun: "sign-in attempts" },
  signup: { ip: "authSignupIp", account: "authSignupAccount", noun: "sign-up attempts" },
  passwordReset: {
    ip: "authPasswordResetIp",
    account: "authPasswordResetAccount",
    noun: "password reset requests",
  },
  passwordUpdate: {
    ip: "authPasswordUpdateIp",
    account: "authPasswordUpdateAccount",
    noun: "password change attempts",
  },
  oauth: { ip: "authOauthIp", noun: "sign-in attempts" },
};

export interface AuthThrottle {
  /** Seconds to wait before this attempt may proceed (0 = allowed). */
  retryAfter(): Promise<number>;
  /** Counts an attempt/failure against both the IP and the account. */
  record(): Promise<number>;
  /** Clears the per-account backoff (IP backoff is kept so one good login can't reset it). */
  clearAccount(): Promise<void>;
  message(seconds: number): string;
}

/**
 * Per-IP + per-account exponential backoff for an auth flow. The account is
 * the normalized email (or user id); attempts for unknown accounts are
 * throttled the same way so responses don't reveal which accounts exist.
 */
export async function authThrottle(flow: AuthFlow, account?: string | null): Promise<AuthThrottle> {
  const policies = FLOW_POLICIES[flow];
  const ip = getClientIp(await headers());

  const ipSubject: BackoffSubject = { policy: policies.ip, identifier: ip };
  const accountSubject: BackoffSubject | null =
    policies.account && account
      ? { policy: policies.account, identifier: account.trim().toLowerCase() }
      : null;
  const subjects = accountSubject ? [ipSubject, accountSubject] : [ipSubject];

  return {
    retryAfter: () => getBackoffDelay(subjects),
    record: () => recordBackoffEvent(subjects),
    clearAccount: () => (accountSubject ? clearBackoff([accountSubject]) : Promise.resolve()),
    message: (seconds) =>
      `Too many ${policies.noun}. Please wait ${formatRetryAfter(seconds)} and try again.`,
  };
}
