/**
 * GET /api/admin/communications/messages/pulse
 * Lightweight SSOT pulse for admin alerts (unread + latest session touch).
 * Used when browser Realtime is delayed/unavailable — not a heavy view scan.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

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

    const [unreadRes, latestRes, latestJobRes] = await Promise.all([
      admin.rpc("admin_help_unread_total", { p_organization_id: orgId }),
      admin
        .from("live_chat_sessions")
        .select("id, updated_at, last_message_preview, last_sender_type, unread_driver_count")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("bookings")
        .select("id, reference, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (unreadRes.error) {
      return NextResponse.json({ error: unreadRes.error.message }, { status: 500 });
    }
    if (latestRes.error) {
      return NextResponse.json({ error: latestRes.error.message }, { status: 500 });
    }
    if (latestJobRes.error) {
      return NextResponse.json({ error: latestJobRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      unread: Number(unreadRes.data) || 0,
      latestSession: latestRes.data
        ? {
            id: latestRes.data.id,
            updatedAt: latestRes.data.updated_at,
            preview: latestRes.data.last_message_preview,
            lastSenderType: latestRes.data.last_sender_type,
            unread: Number(latestRes.data.unread_driver_count) || 0,
          }
        : null,
      latestJob: latestJobRes.data
        ? {
            id: latestJobRes.data.id,
            reference: latestJobRes.data.reference,
            createdAt: latestJobRes.data.created_at,
          }
        : null,
    });
  } catch (err) {
    console.error("[communications/messages/pulse GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
