import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateCheckout, normalizePhone } from "@/lib/validation";
import { lookupPincode } from "@/lib/pincode";
import {
  resolveDeliveryZone,
  getZoneCharge,
  DEFAULT_DELIVERY_ZONES,
  DeliveryZoneSettings,
} from "@/lib/deliveryZones";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateBillPdfBytes } from "@/lib/billPdf";
import { Order } from "@/lib/types";

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
    const {
      name,
      phone,
      address_line1,
      address_line2,
      pincode,
      city,
      state,
      items,
      honeypot,
    } = body;

    // --- Authoritative pincode check -----------------------------------
    // Never trust the city/state the client sent. Re-verify the pincode
    // against India Post ourselves. Orders are only accepted for pincodes
    // India Post actually recognizes, anywhere in India.
    const pincodeStr = typeof pincode === "string" ? pincode.trim() : "";
    const pincodeResult = await lookupPincode(pincodeStr);

    const check = validateCheckout({
      name,
      phone,
      address_line1,
      address_line2,
      pincode: pincodeStr,
      // Use the server-verified city/state as the source of truth once
      // found; fall back to client-entered values only for shape validation
      // when the lookup didn't return anything (in which case pincodeVerified
      // below will block the order anyway).
      city: pincodeResult.found ? pincodeResult.city || city : city,
      state: pincodeResult.found ? pincodeResult.state : state,
      honeypot,
      pincodeVerified: pincodeResult.found,
    });
    if (!check.valid) {
      return NextResponse.json({ error: "validation_failed", details: check.errors }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    const subtotal = items.reduce(
      (sum: number, i: any) => sum + Number(i.price) * Number(i.qty),
      0
    );

    const client = supabase();
    const admin = supabaseAdmin();

    // --- Delivery zone + charge (server-resolved, never client-trusted) --
    const resolvedCity = pincodeResult.city || city;
    const resolvedState = pincodeResult.state || state || "Maharashtra";
    const zoneKey = resolveDeliveryZone(resolvedCity, resolvedState);

    let zoneSettings: DeliveryZoneSettings = DEFAULT_DELIVERY_ZONES;
    const { data: zoneRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "delivery_zones")
      .maybeSingle();
    if (zoneRow?.value) zoneSettings = zoneRow.value as DeliveryZoneSettings;

    const deliveryCharge = getZoneCharge(zoneSettings, zoneKey);
    const total = subtotal + deliveryCharge;

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
        address_line1: address_line1.trim(),
        address_line2: address_line2?.trim() || null,
        pincode: pincodeStr,
        city: resolvedCity.trim(),
        state: resolvedState.trim(),
        items,
        subtotal,
        delivery_charge: deliveryCharge,
        delivery_zone: zoneKey,
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

    let order = data as Order;

    // --- Auto-generate the bill immediately -----------------------------
    // The bill (and its public URL) should exist from the moment the order
    // is placed, so every WhatsApp status update from here on — including
    // the very first "Order Received" message — can include the bill link.
    // Failure here should never block order placement, so it's best-effort.
    try {
      const pdfBytes = await generateBillPdfBytes(order);
      const path = `${order.id}/${Date.now()}-bill.pdf`;

      const { error: uploadError } = await admin.storage
        .from("bills")
        .upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = admin.storage.from("bills").getPublicUrl(path);
        const { data: updated, error: updateError } = await admin
          .from("orders")
          .update({ bill_url: publicUrlData.publicUrl })
          .eq("id", order.id)
          .select()
          .single();
        if (!updateError && updated) order = updated as Order;
      } else {
        console.error("auto bill upload error", uploadError);
      }
    } catch (billErr) {
      console.error("auto bill generation error", billErr);
    }

    return NextResponse.json({ order });
  } catch (e) {
    console.error("order route error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
