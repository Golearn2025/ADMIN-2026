/**
 * GET /api/admin/customers/search?q=...
 * Quick search by email, phone or name for New Job customer selector.
 * Uses service role so admins see all customers (not only their own RLS row).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 500 });
  }

  // Escape commas/% for PostgREST .or() filter safety
  const safe = q.replace(/[%_,]/g, " ").trim();
  if (safe.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const { data, error } = await admin
    .from("customers")
    .select("id, email, first_name, last_name, phone")
    .or(`email.ilike.%${safe}%,phone.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customers: data ?? [] });
}
