/**
 * POST /api/admin/communications/notifications/send
 *
 * - audience=one  → admin_enqueue_driver_notification (individual, no campaign_id)
 * - audience=all  → admin_enqueue_driver_notification_campaign (one RPC, shared campaign_id)
 *
 * Uses service-role admin client only (RPCs are not granted to authenticated).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";
import { getUserRole } from "@/lib/auth/roles";
import {
  DOCUMENT_INBOX_TYPES,
  UPDATES_INBOX_TYPES,
  type InboxNotificationType,
} from "@/lib/features/communications";

type SendBody = {
  type?: InboxNotificationType;
  title?: string;
  body?: string;
  driverId?: string | null;
  audience?: "one" | "all";
};

const ALLOWED = new Set<string>([
  ...UPDATES_INBOX_TYPES,
  ...DOCUMENT_INBOX_TYPES,
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasAccess } = await getUserRole();
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = await getCurrentOrg(supabase, user.id);
    if (!orgId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const payload = (await req.json()) as SendBody;
    const type = payload.type;
    const title = (payload.title || "").trim();
    const body = (payload.body || "").trim();
    const audience = payload.audience === "all" ? "all" : "one";

    if (!type || !ALLOWED.has(type)) {
      return NextResponse.json({ error: "Invalid inbox type" }, { status: 400 });
    }
    if (!title || !body) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    let driverIds: string[] = [];

    if (audience === "one") {
      if (!payload.driverId) {
        return NextResponse.json({ error: "driverId is required" }, { status: 400 });
      }

      const { data: driver, error: driverError } = await admin
        .from("admin_drivers_list_v4")
        .select("id")
        .eq("organization_id", orgId)
        .eq("id", payload.driverId)
        .eq("is_active", true)
        .maybeSingle();

      if (driverError) {
        return NextResponse.json({ error: driverError.message }, { status: 500 });
      }
      if (!driver?.id) {
        return NextResponse.json(
          { error: "Driver not found in organization" },
          { status: 400 }
        );
      }
      driverIds = [driver.id as string];
    } else {
      const { data: drivers, error: driversError } = await admin
        .from("admin_drivers_list_v4")
        .select("id")
        .eq("organization_id", orgId)
        .eq("is_active", true);

      if (driversError) {
        return NextResponse.json({ error: driversError.message }, { status: 500 });
      }
      driverIds = (drivers || []).map((d) => d.id as string);
    }

    if (driverIds.length === 0) {
      return NextResponse.json({ error: "No drivers to notify" }, { status: 400 });
    }

    if (audience === "all") {
      const { data: campaignId, error } = await admin.rpc(
        "admin_enqueue_driver_notification_campaign",
        {
          p_organization_id: orgId,
          p_driver_ids: driverIds,
          p_type: type,
          p_title: title,
          p_body: body,
          p_actor_id: user.id,
        }
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        mode: "campaign",
        sent: driverIds.length,
        failed: 0,
        campaignId: campaignId as string,
        recipientCount: driverIds.length,
        eventIds: [],
        errors: [],
      });
    }

    const { data: eventId, error } = await admin.rpc("admin_enqueue_driver_notification", {
      p_organization_id: orgId,
      p_driver_id: driverIds[0],
      p_type: type,
      p_title: title,
      p_body: body,
      p_actor_id: user.id,
    });

    if (error) {
      return NextResponse.json({
        mode: "individual",
        sent: 0,
        failed: 1,
        eventIds: [],
        errors: [{ driverId: driverIds[0], error: error.message }],
      });
    }

    return NextResponse.json({
      mode: "individual",
      sent: eventId ? 1 : 0,
      failed: 0,
      eventIds: eventId ? [eventId as string] : [],
      errors: [],
    });
  } catch (err) {
    console.error("[communications/notifications/send POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
