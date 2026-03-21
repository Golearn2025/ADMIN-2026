import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update profile photo status to approved
    const { error } = await supabase
      .from("drivers")
      .update({
        profile_photo_status: "approved",
        profile_photo_reviewed_by: user.id,
        profile_photo_reviewed_at: new Date().toISOString(),
        profile_photo_rejection_reason: null,
      })
      .eq("id", id);

    if (error) {
      console.error("Error approving profile photo:", error);
      return NextResponse.json(
        { error: "Failed to approve profile photo" },
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
