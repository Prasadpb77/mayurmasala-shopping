import { Order, formatOrderAddress } from "./types";

// Opens a print-ready receipt sized for 58mm ("2 inch") thermal printers.
// Uses the browser's native print dialog — works with any thermal printer
// set up as a normal system printer (most POS thermal printers support this
// via their Windows/Android driver). @page CSS forces the correct paper width.
export function openThermalPrintWindow(order: Order) {
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

  const html = `
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

  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Please allow pop-ups to print the bill.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
