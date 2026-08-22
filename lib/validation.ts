// Validation helpers used on the checkout form to keep out spam / junk orders.

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

/**
 * Accepts Indian mobile numbers:
 *  - 9876543210
 *  - +919876543210
 *  - 919876543210
 * Must start with 6-9 after the country code, exactly 10 digits.
 */
export function isValidIndianPhone(raw: string): boolean {
  const cleaned = normalizePhone(raw).replace(/^\+/, "");
  const withoutCountryCode = cleaned.startsWith("91") && cleaned.length === 12
    ? cleaned.slice(2)
    : cleaned;
  return /^[6-9]\d{9}$/.test(withoutCountryCode);
}

export function toE164Whatsapp(raw: string): string {
  const cleaned = normalizePhone(raw).replace(/^\+/, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  return `91${cleaned}`;
}

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  // letters, spaces, dots, apostrophes only - blocks links/numbers/emoji spam
  return /^[a-zA-Z.\s']+$/.test(trimmed);
}

export function isValidAddress(address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 10 || trimmed.length > 300) return false;
  // block obvious URL/spam injection
  if (/https?:\/\//i.test(trimmed)) return false;
  return true;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    phone?: string;
    address?: string;
  };
}

export function validateCheckout(input: {
  name: string;
  phone: string;
  address: string;
  honeypot?: string;
}): CheckoutValidationResult {
  const errors: CheckoutValidationResult["errors"] = {};

  // Honeypot: real users never fill this hidden field. Bots often do.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { valid: false, errors: { name: "Submission blocked." } };
  }

  if (!isValidName(input.name)) {
    errors.name = "Enter your full name using letters only (3-60 characters).";
  }
  if (!isValidIndianPhone(input.phone)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  }
  if (!isValidAddress(input.address)) {
    errors.address = "Enter a complete delivery address (at least 10 characters, no links).";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
