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

// GET all prices for a check (with competitor + scenario data)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, supabase, orgId, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin ?? supabase;
  const { id: checkId } = await params;

  const { data: check, error: checkErr } = await db
    .from("market_checks")
    .select("*")
    .eq("id", checkId)
    .eq("organization_id", orgId)
    .single();
  if (checkErr || !check) return NextResponse.json({ error: "Check not found" }, { status: 404 });

  const { data: prices, error } = await db
    .from("market_check_prices")
    .select("*, competitor:market_competitors(*), scenario:market_scenarios(*, route_template:market_route_templates(*))")
    .eq("check_id", checkId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ check, prices });
}

// POST: upsert a single price entry
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, supabase, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin ?? supabase;
  const { id: checkId } = await params;
  const body = await request.json();
  const { scenario_id, price_role, competitor_id, amount_pence, extra_hours, notes } = body;
  if (!scenario_id || !price_role || amount_pence == null) {
    return NextResponse.json({ error: "scenario_id, price_role, amount_pence required" }, { status: 400 });
  }

  // Find existing row
  let query = db.from("market_check_prices")
    .select("id")
    .eq("check_id", checkId)
    .eq("scenario_id", scenario_id)
    .eq("price_role", price_role);
  if (price_role === "competitor" && competitor_id) {
    query = query.eq("competitor_id", competitor_id);
  }
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("market_check_prices")
      .update({ amount_pence, extra_hours: extra_hours ?? null, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ price: data });
  }

  const { data, error } = await db
    .from("market_check_prices")
    .insert({ check_id: checkId, scenario_id, price_role, competitor_id: competitor_id ?? null, amount_pence, extra_hours: extra_hours ?? null, notes: notes ?? null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ price: data }, { status: 201 });
}

// PATCH: bulk upsert (array of price rows)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { admin, supabase, user } = await getDb();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = admin ?? supabase;
  const { id: checkId } = await params;
  const body = await request.json();
  const { prices } = body;
  if (!Array.isArray(prices)) return NextResponse.json({ error: "prices array required" }, { status: 400 });

  const results = await Promise.allSettled(
    prices.map(async (p: any) => {
      let query = db.from("market_check_prices")
        .select("id")
        .eq("check_id", checkId)
        .eq("scenario_id", p.scenario_id)
        .eq("price_role", p.price_role);
      if (p.price_role === "competitor" && p.competitor_id) {
        query = query.eq("competitor_id", p.competitor_id);
      }
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        return db.from("market_check_prices")
          .update({ amount_pence: p.amount_pence, extra_hours: p.extra_hours ?? null, notes: p.notes ?? null, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return db.from("market_check_prices").insert({
        check_id: checkId,
        scenario_id: p.scenario_id,
        price_role: p.price_role,
        competitor_id: p.competitor_id ?? null,
        amount_pence: p.amount_pence,
        extra_hours: p.extra_hours ?? null,
        notes: p.notes ?? null,
      });
    })
  );

  const errors = results.filter(r => r.status === "rejected");
  if (errors.length > 0) return NextResponse.json({ error: "Some prices failed to save" }, { status: 500 });
  return NextResponse.json({ ok: true, saved: prices.length });
}
