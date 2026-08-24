import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/requireAdmin";
import { generateBillPdfBytes } from "@/lib/billPdf";
import { Order } from "@/lib/types";

// Generates the thermal-format bill PDF entirely server-side and uploads it.
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

    const pdfBytes = await generateBillPdfBytes(order as Order);
    const path = `${orderId}/${Date.now()}-bill.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("bills")
      .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("bill upload error", uploadError);
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("bills").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ bill_url: publicUrlData.publicUrl })
      .eq("id", orderId);

    if (updateError) {
      console.error("order update error", updateError);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (e) {
    console.error("bill generation error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
