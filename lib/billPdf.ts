import { jsPDF } from "jspdf";
import { Order, formatOrderAddress } from "./types";

// Thermal receipt printers commonly used by small shops print on 58mm
// ("2 inch") paper rolls. We generate a PDF sized exactly to that width,
// with a dynamic height based on the number of items, so it prints cleanly
// on thermal printers and also opens fine as a normal PDF elsewhere.
//
// Deliberately does NOT include a UPI QR code or any payment link — a bill
// artifact (PDF/print) shouldn't carry a payout destination baked into it,
// since anything embedded in a generated file is one more thing that could
// theoretically be tampered with. Payment links live only in the WhatsApp
// message, generated fresh from the locked, DB-read UPI settings.
const PAGE_WIDTH_MM = 58;
const MARGIN_MM = 3;
const LINE_HEIGHT_MM = 4.2;

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

// Generates the receipt PDF as raw bytes (ArrayBuffer). Runs equally well
// server-side (Node, inside an authenticated API route) or client-side.
// Called from app/api/admin/bill/route.ts.
export async function generateBillPdfBytes(order: Order): Promise<ArrayBuffer> {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";
  const shopAddress = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "";
  const shopPhone = process.env.NEXT_PUBLIC_SHOP_PHONE || "";
  const contentWidth = PAGE_WIDTH_MM - MARGIN_MM * 2;

  // Estimate height first, since jsPDF needs page height up front. Roughly:
  // header block + one line per item + footer.
  const estimatedLines = 17 + order.items.length * 2;
  const estimatedHeight = estimatedLines * LINE_HEIGHT_MM + 20;

  const doc = new jsPDF({
    unit: "mm",
    format: [PAGE_WIDTH_MM, estimatedHeight],
  });

  let y = MARGIN_MM + 2;

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(shopName, PAGE_WIDTH_MM / 2, y, { align: "center", maxWidth: contentWidth });
  y += LINE_HEIGHT_MM + 1;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  if (shopAddress) {
    const lines = wrapText(doc, shopAddress, contentWidth);
    lines.forEach((line) => {
      doc.text(line, PAGE_WIDTH_MM / 2, y, { align: "center" });
      y += 3.2;
    });
  }
  if (shopPhone) {
    doc.text(shopPhone, PAGE_WIDTH_MM / 2, y, { align: "center" });
    y += 3.2;
  }

  y += 1.5;
  doc.setLineWidth(0.2);
  doc.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
  y += 3.5;

  doc.setFontSize(8);
  doc.text(`Order: ${order.order_number}`, MARGIN_MM, y);
  y += LINE_HEIGHT_MM;
  doc.text(
    `Date: ${new Date(order.created_at).toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    })}`,
    MARGIN_MM,
    y
  );
  y += LINE_HEIGHT_MM;
  doc.text(`Customer: ${order.customer_name}`, MARGIN_MM, y);
  y += LINE_HEIGHT_MM;
  doc.text(`Phone: ${order.phone}`, MARGIN_MM, y);
  y += LINE_HEIGHT_MM;

  const addressLines = wrapText(doc, formatOrderAddress(order), contentWidth);
  addressLines.forEach((line) => {
    doc.text(line, MARGIN_MM, y);
    y += 3.4;
  });

  y += 1.5;
  doc.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
  y += 3.5;

  doc.setFont("courier", "bold");
  doc.text("Item", MARGIN_MM, y);
  doc.text("Qty", PAGE_WIDTH_MM - MARGIN_MM - 14, y);
  doc.text("Amt", PAGE_WIDTH_MM - MARGIN_MM, y, { align: "right" });
  y += LINE_HEIGHT_MM;
  doc.setFont("courier", "normal");

  order.items.forEach((item) => {
    const nameLines = wrapText(doc, item.name, contentWidth - 20);
    doc.text(nameLines[0], MARGIN_MM, y);
    doc.text(String(item.qty), PAGE_WIDTH_MM - MARGIN_MM - 14, y);
    doc.text(`Rs.${(item.price * item.qty).toFixed(0)}`, PAGE_WIDTH_MM - MARGIN_MM, y, {
      align: "right",
    });
    y += 3.6;
    for (let i = 1; i < nameLines.length; i++) {
      doc.text(nameLines[i], MARGIN_MM, y);
      y += 3.4;
    }
    y += 0.6;
  });

  y += 1;
  doc.line(MARGIN_MM, y, PAGE_WIDTH_MM - MARGIN_MM, y);
  y += 3.8;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const subtotal = order.subtotal ?? order.total - order.delivery_charge;
  doc.text("Subtotal", MARGIN_MM, y);
  doc.text(`Rs.${subtotal.toFixed(0)}`, PAGE_WIDTH_MM - MARGIN_MM, y, { align: "right" });
  y += LINE_HEIGHT_MM;

  if (order.delivery_charge > 0) {
    doc.text("Delivery", MARGIN_MM, y);
    doc.text(`Rs.${order.delivery_charge.toFixed(0)}`, PAGE_WIDTH_MM - MARGIN_MM, y, { align: "right" });
    y += LINE_HEIGHT_MM;
  }
  y += 0.8;

  doc.setFont("courier", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL", MARGIN_MM, y);
  doc.text(`Rs.${order.total.toFixed(0)}`, PAGE_WIDTH_MM - MARGIN_MM, y, { align: "right" });
  y += LINE_HEIGHT_MM + 1;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text(
    order.payment_received ? "Payment: RECEIVED" : "Payment: CASH ON DELIVERY",
    MARGIN_MM,
    y
  );
  y += 4.5;

  doc.setFontSize(7);
  doc.text("Thank you for shopping with us!", PAGE_WIDTH_MM / 2, y, { align: "center" });
  y += 3.2;
  doc.text("Serving Pimpri since 1992", PAGE_WIDTH_MM / 2, y, { align: "center" });

  return doc.output("arraybuffer");
}
