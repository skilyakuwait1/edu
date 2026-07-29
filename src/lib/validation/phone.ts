export type PhoneNormalizationResult =
  | { valid: true; normalized: string }
  | { valid: false; reason: string };

const KUWAIT_CODE = "965";
const LOCAL_NUMBER_LENGTH = 8; // Kuwait mobile numbers are 8 digits

/**
 * Normalizes a phone number to a canonical digits-only form used as the
 * dedupe key for leads. All of `+96550000000`, `0096550000000`,
 * `96550000000`, and `50000000` normalize to `96550000000`.
 */
export function normalizePhone(
  input: string,
  defaultCountryCode: string = KUWAIT_CODE,
): PhoneNormalizationResult {
  if (!input) return { valid: false, reason: "رقم الهاتف فارغ" };

  // Keep only digits and a leading '+' as a marker, then strip it.
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (!/^\d+$/.test(digits) || digits.length === 0) {
    return { valid: false, reason: "رقم الهاتف يحتوي على رموز غير صالحة" };
  }

  // Bare local number (no country code) -> prepend the default country code.
  if (digits.length === LOCAL_NUMBER_LENGTH) {
    return { valid: true, normalized: `${defaultCountryCode}${digits}` };
  }

  // Already has the default country code prefix.
  if (
    digits.startsWith(defaultCountryCode) &&
    digits.length === defaultCountryCode.length + LOCAL_NUMBER_LENGTH
  ) {
    return { valid: true, normalized: digits };
  }

  // A genuine non-default country code (kept as-is, not rewritten to Kuwait).
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith(defaultCountryCode)) {
    return { valid: true, normalized: digits };
  }

  return { valid: false, reason: "طول رقم الهاتف غير صحيح" };
}

/** Strips the country code so agents can dial straight from the Grandstream extension. */
export function phoneLocalDigits(normalized: string): string {
  if (normalized.startsWith(KUWAIT_CODE) && normalized.length === 11) {
    return normalized.slice(3);
  }
  return normalized;
}

export function formatPhoneDisplay(normalized: string): string {
  const local = phoneLocalDigits(normalized);
  if (normalized.startsWith(KUWAIT_CODE) && normalized.length === 11) {
    return `${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return local;
}
