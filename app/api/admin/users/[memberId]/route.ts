import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrg } from "@/lib/auth/org";

const MEMBER_ROLES = ["admin", "owner", "operator", "member"] as const;

function isMemberRole(role: unknown): role is (typeof MEMBER_ROLES)[number] {
  return typeof role === "string" && (MEMBER_ROLES as readonly string[]).includes(role);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    if (!currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const role = body?.role;

    if (!isMemberRole(role)) {
      return NextResponse.json(
        { error: "role must be admin|owner|operator|member" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    const { data, error } = await admin
      .from("organization_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("organization_id", currentOrgId)
      .select("id, user_id, role, organization_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update role", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Member not found in current organization" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[users PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrgId = await getCurrentOrg(supabase, user.id);
    if (!currentOrgId) {
      return NextResponse.json(
        { error: "No organization context found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfiguration: admin client unavailable" },
        { status: 500 }
      );
    }

    const { data, error } = await admin
      .from("organization_members")
      .delete()
      .eq("id", memberId)
      .eq("organization_id", currentOrgId)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove member", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Member not found in current organization" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[users DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
