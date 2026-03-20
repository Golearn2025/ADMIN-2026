import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Check compliance status from driver_compliance_v3
    const { data: compliance, error: complianceError } = await supabase
      .from("driver_compliance_v3")
      .select("compliance_status")
      .eq("driver_id", id)
      .single();

    if (complianceError) {
      return NextResponse.json(
        { error: "Failed to check compliance status" },
        { status: 500 }
      );
    }

    // Validate compliance status
    if (compliance.compliance_status !== "ok") {
      return NextResponse.json(
        {
          error: "Cannot approve driver",
          message: `Driver compliance status is '${compliance.compliance_status}'. Only drivers with 'ok' compliance can be approved.`,
        },
        { status: 400 }
      );
    }

    // Approve driver
    const { error: updateError } = await supabase
      .from("drivers")
      .update({
        status: "approved",
        status_changed_at: new Date().toISOString(),
        status_reason: null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to approve driver" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
