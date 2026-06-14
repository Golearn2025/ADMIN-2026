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

export async function GET() {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin ?? supabase;
  const { data, error } = await db
    .from("market_competitors")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitors: data });
}

export async function POST(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { name, website_url, runs_google_ads, sort_order } = body;
  if (!name?.trim() || !website_url?.trim()) {
    return NextResponse.json({ error: "Name and website URL are required" }, { status: 400 });
  }
  const db = admin ?? supabase;
  const { data, error } = await db
    .from("market_competitors")
    .insert({ organization_id: orgId, name: name.trim(), website_url: website_url.trim(), runs_google_ads: Boolean(runs_google_ads), sort_order: sort_order ?? 0 })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A competitor with this website URL already exists." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ competitor: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = admin ?? supabase;
  const { data, error } = await db
    .from("market_competitors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ competitor: data });
}

export async function DELETE(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = admin ?? supabase;
  const { error } = await db
    .from("market_competitors")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
