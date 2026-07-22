export const COOKIE_CONSENT_KEY = "buildview-cookie-consent";
export const COOKIE_CONSENT_EVENT = "buildview-cookie-consent-change";

export type CookieConsentValue = "accepted" | "dismissed";

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === "accepted" || value === "dismissed") return value;
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === "accepted";
}

export function writeCookieConsent(value: CookieConsentValue): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}
