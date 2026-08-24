import QRCode from "qrcode";

export interface UpiSettings {
  vpa: string;         // UPI ID, e.g. shopname@okhdfcbank
  payee_name: string;  // Name shown in the customer's UPI app
}

export function isUpiConfigured(upi: UpiSettings | undefined | null): boolean {
  return !!upi?.vpa?.trim();
}

/**
 * Builds a standard UPI deep link (upi://pay?...) prefilled with the shop's
 * VPA, the exact order amount, and a note referencing the order number.
 * Any UPI app (GPay, PhonePe, Paytm, BHIM, etc.) can open this directly.
 */
export function buildUpiUri(upi: UpiSettings, amount: number, orderNumber: string): string {
  const params = new URLSearchParams({
    pa: upi.vpa.trim(),
    pn: upi.payee_name.trim() || "Mayur Masala and Pooja Center",
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Order ${orderNumber}`,
  });
  return `upi://pay?${params.toString()}`;
}

/** Generates a QR code as a PNG data URL, entirely client/server-side (no external API calls). */
export async function buildUpiQrDataUrl(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, { margin: 1, width: 300 });
}

/**
 * Messaging apps like WhatsApp only auto-linkify http(s) URLs, not custom
 * schemes like upi://. So the WhatsApp message links to this https page on
 * our own domain, which immediately redirects to the UPI app on mobile.
 */
export function buildPayPageUrl(orderId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}/pay/${orderId}`;
}
