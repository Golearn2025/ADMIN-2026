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
    .from("market_route_templates")
    .select("*, scenarios:market_scenarios(*)")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ routes: data });
}

export async function POST(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { categories = ["executive", "luxury", "suv", "mpv"], ...routeFields } = body;
  if (!routeFields.name?.trim() || !routeFields.trip_type) {
    return NextResponse.json({ error: "Name and trip_type required" }, { status: 400 });
  }
  const db = admin ?? supabase;
  const { data: route, error: routeErr } = await db
    .from("market_route_templates")
    .insert({ ...routeFields, organization_id: orgId })
    .select("*")
    .single();
  if (routeErr) return NextResponse.json({ error: routeErr.message }, { status: 500 });

  if (categories.length > 0) {
    const scenarios = (categories as string[]).map((cat: string, i: number) => ({
      route_template_id: route.id,
      vehicle_category_id: cat,
      sort_order: i,
    }));
    await db.from("market_scenarios").insert(scenarios);
  }

  const { data: full } = await db
    .from("market_route_templates")
    .select("*, scenarios:market_scenarios(*)")
    .eq("id", route.id)
    .single();
  return NextResponse.json({ route: full }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, categories, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = admin ?? supabase;
  const { data, error } = await db
    .from("market_route_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (categories) {
    await db.from("market_scenarios").delete().eq("route_template_id", id);
    if (categories.length > 0) {
      await db.from("market_scenarios").insert(
        (categories as string[]).map((cat: string, i: number) => ({
          route_template_id: id,
          vehicle_category_id: cat,
          sort_order: i,
        }))
      );
    }
  }
  return NextResponse.json({ route: data });
}

export async function DELETE(request: NextRequest) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = admin ?? supabase;
  const { error } = await db
    .from("market_route_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
