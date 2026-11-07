/**
 * DELETE /api/admin/operating-costs/[id] — soft delete
 * PATCH  /api/admin/operating-costs/[id] — end / reactivate / payment paid|unpaid
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrg } from "@/lib/auth/org";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrg(supabase, user.id);
    if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const { error } = await admin
      .from("operating_costs")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[operating-costs DELETE]", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getCurrentOrg(supabase, user.id);
    if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const patch: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status != null) {
      const status = body.status === "ended" ? "ended" : body.status === "active" ? "active" : null;
      if (!status) {
        return NextResponse.json({ error: "status must be active|ended" }, { status: 400 });
      }
      patch.status = status;
      patch.end_date =
        status === "ended" ? new Date().toISOString().slice(0, 10) : null;
    }

    if (body.paymentStatus != null || body.payment_status != null) {
      const raw = body.paymentStatus ?? body.payment_status;
      const paymentStatus = raw === "paid" ? "paid" : raw === "unpaid" ? "unpaid" : null;
      if (!paymentStatus) {
        return NextResponse.json({ error: "paymentStatus must be paid|unpaid" }, { status: 400 });
      }
      patch.payment_status = paymentStatus;
    }

    if (!("status" in patch) && !("payment_status" in patch)) {
      return NextResponse.json(
        { error: "Provide status and/or paymentStatus" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("operating_costs")
      .update(patch)
      .eq("id", id)
      .eq("organization_id", orgId)
      .is("deleted_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[operating-costs PATCH]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
