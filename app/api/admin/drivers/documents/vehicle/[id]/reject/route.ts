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

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Get current user for audit logging
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update document status with reviewer info
    const { error: updateError } = await supabase
      .from("vehicle_documents")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to reject document" },
        { status: 500 }
      );
    }

    // Fetch updated document
    const { data: document, error } = await supabase
      .from("vehicle_documents")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch updated document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
