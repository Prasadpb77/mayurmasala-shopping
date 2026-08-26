import { Order, STATUS_LABELS } from "./types";
import { toE164Whatsapp } from "./validation";
import { UpiSettings, isUpiConfigured, buildPayPageUrl } from "./upi";

/**
 * Builds a wa.me click-to-chat link that opens WhatsApp with a pre-filled
 * message. No WhatsApp Business API needed — this is the free "click to chat"
 * feature. Used by the dashboard to notify customers about status updates,
 * and can also be used to message the shop's own number for order alerts.
 */
export function buildStatusUpdateWhatsappLink(order: Order, upi?: UpiSettings): string {
  const itemsText = order.items
    .map((i) => `- ${i.name} x${i.qty} (₹${(i.price * i.qty).toFixed(2)})`)
    .join("\n");

  const showPayLink =
    order.status === "out_for_delivery" && !order.payment_received && isUpiConfigured(upi);

  const message = [
    `Namaste ${order.customer_name},`,
    ``,
    `Update on your Mayur Masala and Pooja Center order *${order.order_number}*:`,
    `Status: *${STATUS_LABELS[order.status]}*`,
    ``,
    `Items:`,
    itemsText,
    ``,
    `Total: ₹${order.total}`,
    order.delivery_charge > 0 ? `(includes ₹${order.delivery_charge} delivery charge)` : ``,
    order.payment_received ? `Payment: Received, thank you!` : `Payment: Cash on Delivery`,
    order.bill_url ? `Bill: ${order.bill_url}` : ``,
    showPayLink ? `` : ``,
    showPayLink ? `Prefer to pay online? Pay via UPI: ${buildPayPageUrl(order.id)}` : ``,
    ``,
    `Track your order: ${buildTrackingUrl(order.id)}`,
    ``,
    `Thank you for shopping with us since 1992!`,
  ]
    .filter(Boolean)
    .join("\n");

  const phone = toE164Whatsapp(order.phone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildTrackingUrl(orderId: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}/track/${orderId}`;
}

export function buildShopWhatsappLink(message: string): string {
  const shopNumber = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || "";
  return `https://wa.me/${shopNumber}?text=${encodeURIComponent(message)}`;
}
