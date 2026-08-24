import "server-only";
import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service role key, which bypasses Row Level Security
// entirely — never import this file from a "use client" component, and
// never send this key to the browser. It exists so a handful of narrow,
// deliberately-scoped API routes (e.g. fetching a single order by id for
// the tracking/pay pages) can work even though the "orders" table has no
// public SELECT policy at all.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
