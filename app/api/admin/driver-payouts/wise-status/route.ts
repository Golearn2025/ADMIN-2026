/**
 * GET /api/admin/driver-payouts/wise-status
 * Verifies WISE_API_TOKEN against Wise profiles API.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWiseConnectionStatus } from "@/lib/features/driver-payouts/wise-api";

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

    const status = await getWiseConnectionStatus();
    return NextResponse.json(status, { status: status.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
