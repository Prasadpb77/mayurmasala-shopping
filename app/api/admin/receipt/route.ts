import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { buildReceiptHtml } from "@/lib/receiptHtml";
import { Order } from "@/lib/types";

// Builds the print-ready thermal receipt HTML entirely server-side.
// No UPI/payment data is included in the bill at all — see lib/billPdf.ts.
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "order_not_found" }, { status: 404 });
    }

    const html = buildReceiptHtml(order as Order);
    return NextResponse.json({ html });
  } catch (e) {
    console.error("receipt generation error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
