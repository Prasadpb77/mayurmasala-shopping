import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Order, formatOrderAddress } from "@/lib/types";

// Same JSON "rows" format used by the companion billing app
// (mayurmasala-bllling/api/print-bill.js) — this is what the RawBT Android
// app expects when it fetches a URL via a `rawbt:` intent link. Each row is
// { type, content, bold, align, format }: align 0=left/1=center/2=right,
// format is RawBT's font-size code (0=normal, 2/3=larger, 4=small).
//
// No UPI/payment link is included here — see the note in lib/billPdf.ts.
//
// Public GET, keyed only by the order's random UUID (same trust model as
// /api/orders/[id]): RawBT can't send an Authorization header, so this
// mirrors the reference app's design rather than requiring admin auth.
// It only ever returns a single order looked up by exact id — no listing,
// no scraping surface.

const SOLID = "================================";
const BLANK = { type: 0, content: " ", bold: 0, align: 0, format: 0 };

function text(content: string, opts: { bold?: number; align?: number; format?: number } = {}) {
  return { type: 0, content, bold: opts.bold || 0, align: opts.align || 0, format: opts.format || 0 };
}

function pad(str: string | number, len: number, right = false): string {
  const s = String(str).substring(0, len);
  return right ? s.padStart(len) : s.padEnd(len);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing ?id= parameter" }, { status: 400 });
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || "Mayur Masala and Pooja Center";
  const shopAddress = process.env.NEXT_PUBLIC_SHOP_ADDRESS || "";
  const shopPhone = process.env.NEXT_PUBLIC_SHOP_PHONE || "";

  try {
    const supabase = supabaseAdmin();
    const { data: order, error } = await supabase.from("orders").select("*").eq("id", id).single();

    if (error || !order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const o = order as Order;
    const rows: ReturnType<typeof text>[] = [];

    rows.push(text(shopName, { bold: 1, align: 1, format: 2 }));
    if (shopAddress) rows.push(text(shopAddress, { align: 1 }));
    if (shopPhone) rows.push(text(`Ph: ${shopPhone}`, { align: 1 }));
    rows.push(text(SOLID));

    const IST = { timeZone: "Asia/Kolkata" };
    const dateStr = new Date(o.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...IST,
    });
    const timeStr = new Date(o.created_at).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      ...IST,
    });

    rows.push(text(`Bill: ${o.order_number}`));
    rows.push(text(`Date: ${dateStr} ${timeStr}`));
    rows.push(text(`Cust: ${o.customer_name}`));
    rows.push(text(`Ph  : ${o.phone}`));
    formatOrderAddress(o)
      .split(", ")
      .forEach((line) => rows.push(text(line)));
    rows.push(text(SOLID));

    rows.push(text("Item        Qty  Rate    Amt", { bold: 1 }));
    rows.push(text("------------------------------"));

    o.items.forEach((item) => {
      const name = pad(item.name, 10);
      const qty = pad(item.qty, 3, true);
      const rate = pad(item.price.toFixed(2), 6, true);
      const amt = pad((item.price * item.qty).toFixed(2), 7, true);
      rows.push(text(`${name} ${qty} ${rate} ${amt}`));
    });

    rows.push(text(SOLID));
    const subtotal = o.subtotal ?? o.total - o.delivery_charge;
    rows.push(text(`Subtotal              Rs.${subtotal.toFixed(2)}`, { align: 2 }));
    if (o.delivery_charge > 0) {
      rows.push(text(`Delivery              Rs.${o.delivery_charge.toFixed(2)}`, { align: 2 }));
    }
    rows.push(text(`TOTAL Rs.${o.total.toFixed(2)}`, { bold: 1, align: 1, format: 3 }));
    rows.push(text(SOLID));

    rows.push(
      text(o.payment_received ? "** PAYMENT RECEIVED **" : "** CASH ON DELIVERY **", {
        bold: 1,
        align: 1,
      })
    );

    rows.push(BLANK);
    rows.push(text("Thank you!", { bold: 1, align: 1, format: 3 }));
    rows.push(text("Shopping with us since 1992", { align: 1, format: 4 }));
    rows.push(BLANK);
    rows.push(BLANK);

    const payload: Record<number, unknown> = {};
    rows.forEach((row, i) => {
      payload[i] = row;
    });

    return NextResponse.json(payload);
  } catch (e) {
    console.error("print-bill error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
