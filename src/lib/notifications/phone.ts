/**
 * Normalize user-entered phones to E.164 for WhatsApp.
 * Bare 10-digit Indian mobiles become +91XXXXXXXXXX.
 */
export function toE164Phone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function isValidE164(phone: string | null | undefined): boolean {
  return Boolean(phone && /^\+[1-9]\d{9,14}$/.test(phone));
}
