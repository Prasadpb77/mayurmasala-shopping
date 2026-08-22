import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateCheckout, normalizePhone } from "@/lib/validation";

// Uses the anon key — inserts are allowed by RLS policy "public insert orders".
// This route exists mainly to run server-side validation + generate the
// order number before the row is written, so client tampering can't bypass checks.
function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, address, items, honeypot } = body;

    const check = validateCheckout({ name, phone, address, honeypot });
    if (!check.valid) {
      return NextResponse.json({ error: "validation_failed", details: check.errors }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    const total = items.reduce(
      (sum: number, i: any) => sum + Number(i.price) * Number(i.qty),
      0
    );

    const client = supabase();

    const { data: orderNumberData, error: orderNumberError } = await client.rpc(
      "generate_order_number"
    );
    if (orderNumberError) {
      console.error("order number rpc error", orderNumberError);
    }
    const orderNumber =
      orderNumberData || `MM-${Date.now().toString().slice(-8)}`;

    const { data, error } = await client
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: name.trim(),
        phone: normalizePhone(phone),
        is_whatsapp: true,
        address: address.trim(),
        items,
        total,
        status: "received",
        payment_received: false,
      })
      .select()
      .single();

    if (error) {
      console.error("order insert error", error);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (e) {
    console.error("order route error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
