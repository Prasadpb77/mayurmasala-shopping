import "server-only";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Verifies the Authorization: Bearer <token> header on an admin API request
 * corresponds to a real, currently-valid Supabase session. Returns the user
 * if valid, or null if missing/invalid — callers should respond 401 in that
 * case. This is what stands between these admin-only routes (bill/receipt
 * generation) and an anonymous caller hitting them directly.
 */
export async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}
