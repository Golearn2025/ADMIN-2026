/**
 * GET /api/admin/customers/search?q=...
 * Quick search by email or phone for New Job customer selector.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("customers")
    .select("id, email, first_name, last_name, phone")
    .or(`email.ilike.%${q}%,phone.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .is("deleted_at", null)
    .limit(10)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customers: data ?? [] });
}
