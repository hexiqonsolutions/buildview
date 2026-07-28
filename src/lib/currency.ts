/** BuildView is India-based — default billing currency and locale. */
export const DEFAULT_CURRENCY = "INR" as const;
export const CURRENCY_LOCALE = "en-IN";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
};

/** Normalize legacy USD rows and empty values to INR for India-based billing. */
export function resolveDisplayCurrency(currency?: string | null): string {
  const code = (currency || DEFAULT_CURRENCY).trim().toUpperCase();
  if (!code || code === "USD") return DEFAULT_CURRENCY;
  return code;
}

export function currencyLocale(currency: string): string {
  return LOCALE_BY_CURRENCY[currency.toUpperCase()] ?? CURRENCY_LOCALE;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const code = resolveDisplayCurrency(currency);
  return new Intl.NumberFormat(currencyLocale(code), {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
