import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

async function getDb() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) return { user: null, supabase, admin, orgId: null };
  const orgId = await getCurrentOrg(supabase, user.id);
  return { user, supabase, admin, orgId };
}

export async function GET(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin ?? supabase;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const { data, error } = await db
    .from("market_checks")
    .select("*")
    .eq("organization_id", orgId)
    .order("quote_datetime", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checks: data });
}

export async function POST(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { label, quote_datetime, notes } = body;
  if (!quote_datetime) return NextResponse.json({ error: "quote_datetime required" }, { status: 400 });
  const db = admin ?? supabase;
  const { data, error } = await db
    .from("market_checks")
    .insert({ organization_id: orgId, label: label ?? null, quote_datetime, notes: notes ?? null, checked_by_user_id: user.id })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ check: data }, { status: 201 });
}
