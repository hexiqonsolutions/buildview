/** BuildView is India-based — default billing currency and locale. */
export const DEFAULT_CURRENCY = "INR" as const;
export const CURRENCY_LOCALE = "en-IN";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
};

export function currencyLocale(currency: string): string {
  return LOCALE_BY_CURRENCY[currency.toUpperCase()] ?? CURRENCY_LOCALE;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return new Intl.NumberFormat(currencyLocale(code), {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
