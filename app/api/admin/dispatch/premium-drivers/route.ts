/**
 * POST /api/admin/dispatch/premium-drivers  { driverId }
 * DELETE /api/admin/dispatch/premium-drivers?driverId=
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

const FALLBACK_ORG = "9a5caade-4791-4860-93b5-12b1c4fa9830";

async function resolveCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 as const };
  const orgId = (await getCurrentOrg(supabase, user.id)) || FALLBACK_ORG;
  return { user, orgId, admin: createAdminClient() ?? supabase };
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveCtx();
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const body = await req.json().catch(() => ({}));
    const driverId = typeof body.driverId === "string" ? body.driverId.trim() : "";
    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const { data: driver, error: driverErr } = await ctx.admin
      .from("drivers")
      .select("id, first_name, last_name, phone, status, organization_id")
      .eq("id", driverId)
      .is("deleted_at", null)
      .maybeSingle();

    if (driverErr || !driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    if (driver.organization_id !== ctx.orgId) {
      return NextResponse.json(
        { error: "Driver is not in the current organization" },
        { status: 400 }
      );
    }
    if (driver.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved drivers can be added to premium" },
        { status: 400 }
      );
    }

    const { error } = await ctx.admin.from("dispatch_premium_drivers").upsert(
      {
        organization_id: ctx.orgId,
        driver_id: driverId,
        created_by: ctx.user.id,
      },
      { onConflict: "organization_id,driver_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id,
        name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
        phone: driver.phone,
        status: driver.status,
      },
    });
  } catch (err) {
    console.error("[dispatch/premium-drivers POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await resolveCtx();
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const driverId = (req.nextUrl.searchParams.get("driverId") || "").trim();
    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const { error } = await ctx.admin
      .from("dispatch_premium_drivers")
      .delete()
      .eq("organization_id", ctx.orgId)
      .eq("driver_id", driverId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dispatch/premium-drivers DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
