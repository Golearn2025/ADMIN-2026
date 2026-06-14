import { getUserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY required for driver sign out" },
        { status: 503 },
      );
    }

    const { id: driverId } = await params;

    const { data: driver, error: driverError } = await admin
      .from("drivers")
      .select("id, auth_user_id, email")
      .eq("id", driverId)
      .maybeSingle();

    if (driverError || !driver?.auth_user_id) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const authUserId = driver.auth_user_id as string;
    const now = new Date().toISOString();

    const { error: driverUpdateError } = await admin
      .from("drivers")
      .update({
        current_device_token: null,
        online_status: "offline",
        is_available: false,
        updated_at: now,
      })
      .eq("id", driverId);

    if (driverUpdateError) {
      console.error("[sign-out] driver update error:", driverUpdateError);
      return NextResponse.json({ error: "Failed to update driver" }, { status: 500 });
    }

    await admin
      .from("push_subscriptions")
      .update({
        is_active: false,
        deactivated_at: now,
        deactivation_reason: "admin_force_logout",
        updated_at: now,
      })
      .eq("auth_user_id", authUserId)
      .eq("recipient_type", "driver")
      .eq("app_surface", "driver_app")
      .eq("is_active", true);

    const { error: signOutError } = await admin.auth.admin.signOut(authUserId, "global");

    if (signOutError) {
      console.error("[sign-out] auth signOut error:", signOutError);
      return NextResponse.json(
        { error: "Driver token cleared but auth sign out failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Driver signed out from all devices",
    });
  } catch (error) {
    console.error("[sign-out] API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
