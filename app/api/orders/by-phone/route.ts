import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone, isValidIndianPhone } from "@/lib/validation";

// Lets a customer see all their own orders by entering their phone number.
// Unlike phone numbers, order IDs are unguessable UUIDs — a phone number is
// not a secret, so this route intentionally returns only a summary (no
// street address) to limit what a brute-force phone scan could expose.
// Full order detail (including address) is still only available via the
// exact-UUID route at /api/orders/[id], which the customer reaches by
// clicking into one of the summaries returned here.
export async function GET(req: NextRequest) {
  const phoneParam = req.nextUrl.searchParams.get("phone") || "";

  if (!isValidIndianPhone(phoneParam)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const phone = normalizePhone(phoneParam);

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total, delivery_charge, created_at, payment_received, bill_url")
      .eq("phone", phone)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("orders by phone lookup error", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    console.error("orders by phone route error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
