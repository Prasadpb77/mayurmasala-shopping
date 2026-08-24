import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Used by the customer-facing tracking page (/track/[id]) and pay page
// (/pay/[id]). The "orders" table has no public SELECT policy at all — this
// route is the only way an anonymous visitor can read order data, and it
// only ever returns a single row looked up by its exact (unguessable) UUID.
// It intentionally does not support listing/filtering, so it can't be used
// to enumerate or scrape orders.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  // Basic UUID shape check before hitting the database at all.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();

    if (error || !data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (e) {
    console.error("order lookup error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
