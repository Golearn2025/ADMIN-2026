/**
 * GET  /api/admin/bookings/[id]/dispatch — current wave status
 * POST /api/admin/bookings/[id]/dispatch — { action: 'release_premium' | 'advance_now' }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient() ?? supabase;

    // Advance any expired premium waves opportunistically
    await admin.rpc("advance_expired_job_dispatch_waves");

    const { data: runs, error } = await admin
      .from("job_dispatch_runs")
      .select(
        "id, booking_leg_id, mode, wave, exclusive_driver_id, status, started_at, expires_at, accepted_at, released_at"
      )
      .eq("booking_id", bookingId)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const active = (runs || []).filter((r) => r.status === "active");
    const primary = active[0] || null;

    let exclusiveDriverName: string | null = null;
    if (primary?.exclusive_driver_id) {
      const { data: d } = await admin
        .from("drivers")
        .select("first_name, last_name")
        .eq("id", primary.exclusive_driver_id)
        .maybeSingle();
      exclusiveDriverName = d
        ? `${d.first_name || ""} ${d.last_name || ""}`.trim()
        : null;
    }

    const canReleaseToPremium =
      Boolean(primary) &&
      primary?.wave === "direct" &&
      primary?.status === "active";

    return NextResponse.json({
      active: primary
        ? {
            wave: primary.wave,
            mode: primary.mode,
            status: primary.status,
            exclusiveDriverId: primary.exclusive_driver_id,
            exclusiveDriverName,
            startedAt: primary.started_at,
            expiresAt: primary.expires_at,
          }
        : null,
      canReleaseToPremium,
      runs: runs || [],
    });
  } catch (err) {
    console.error("[bookings/dispatch GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (action === "release_premium") {
      const { data, error } = await admin.rpc("release_booking_dispatch_to_premium", {
        p_booking_id: bookingId,
        p_actor_id: user.id,
      });
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      const result = data as { success?: boolean; error?: string } | null;
      if (!result?.success) {
        return NextResponse.json(
          { success: false, error: result?.error || "Release failed" },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    }

    if (action === "advance_now") {
      // Force premium→open for this booking's active premium runs by expiring them
      const now = new Date().toISOString();
      await admin
        .from("job_dispatch_runs")
        .update({ expires_at: now })
        .eq("booking_id", bookingId)
        .eq("status", "active")
        .eq("wave", "premium");

      const { data, error } = await admin.rpc("advance_expired_job_dispatch_waves");
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, ...(data as object) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[bookings/dispatch POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
