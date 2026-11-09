/**
 * GET /api/admin/communications/drivers
 * SSOT: admin_drivers_list_v4 (picker for send audience)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import type { DriverOption } from "@/lib/features/communications";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrg(supabase, user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const { data, error } = await admin
      .from("admin_drivers_list_v4")
      .select("id, first_name, last_name, email, status, is_active")
      .eq("organization_id", orgId)
      .order("first_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const drivers: DriverOption[] = (data || []).map((d) => ({
      id: d.id as string,
      name: `${d.first_name || ""} ${d.last_name || ""}`.trim() || (d.email as string) || "Driver",
      email: (d.email as string) || null,
      status: (d.status as string) || null,
      is_active: (d.is_active as boolean) ?? null,
    }));

    return NextResponse.json({ drivers });
  } catch (err) {
    console.error("[communications/drivers GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
