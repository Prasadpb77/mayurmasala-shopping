import { Order, formatOrderAddress } from "./types";

// Pure string-building function — no window/document dependency, so this
// runs equally well server-side (Node, inside an API route) or client-side.
// Called from app/api/admin/receipt/route.ts. Deliberately carries no UPI/QR
// data — see the note in lib/billPdf.ts for why.
export function buildReceiptHtml(order: Order): string {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";
  const shopAddress = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "";
  const shopPhone = process.env.NEXT_PUBLIC_SHOP_PHONE || "";

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td class="name">${escapeHtml(item.name)}</td>
          <td class="qty">${item.qty}</td>
          <td class="amt">Rs.${(item.price * item.qty).toFixed(0)}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bill - ${escapeHtml(order.order_number)}</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 54mm;
    margin: 0 auto;
    font-size: 10px;
    color: #000;
  }
  .center { text-align: center; }
  .shop-name { font-size: 13px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.qty { text-align: center; width: 20%; }
  td.amt { text-align: right; width: 30%; }
  .total-row td { font-weight: bold; font-size: 12px; border-top: 1px dashed #000; padding-top: 3px; }
  .meta p { margin: 1px 0; }
  .footer { margin-top: 6px; }
</style>
</head>
<body>
  <div class="center shop-name">${escapeHtml(shopName)}</div>
  ${shopAddress ? `<div class="center">${escapeHtml(shopAddress)}</div>` : ""}
  ${shopPhone ? `<div class="center">${escapeHtml(shopPhone)}</div>` : ""}
  <hr />
  <div class="meta">
    <p>Order: ${escapeHtml(order.order_number)}</p>
    <p>Date: ${new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p>
    <p>Customer: ${escapeHtml(order.customer_name)}</p>
    <p>Phone: ${escapeHtml(order.phone)}</p>
    <p>${escapeHtml(formatOrderAddress(order))}</p>
  </div>
  <hr />
  <table>
    <thead>
      <tr>
        <td class="name"><b>Item</b></td>
        <td class="qty"><b>Qty</b></td>
        <td class="amt"><b>Amt</b></td>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      <tr>
        <td>Subtotal</td>
        <td></td>
        <td class="amt">Rs.${(order.subtotal ?? order.total - order.delivery_charge).toFixed(0)}</td>
      </tr>
      ${order.delivery_charge > 0 ? `<tr>
        <td>Delivery</td>
        <td></td>
        <td class="amt">Rs.${order.delivery_charge.toFixed(0)}</td>
      </tr>` : ""}
      <tr class="total-row">
        <td>TOTAL</td>
        <td></td>
        <td class="amt">Rs.${order.total.toFixed(0)}</td>
      </tr>
    </tbody>
  </table>
  <hr />
  <p>${order.payment_received ? "Payment: RECEIVED" : "Payment: CASH ON DELIVERY"}</p>
  <div class="center footer">
    <p>Thank you for shopping with us!</p>
    <p>Serving Pimpri since 1992</p>
  </div>
  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
