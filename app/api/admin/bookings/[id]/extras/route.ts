import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/roles";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();
    
    const { orgId, hasAccess } = await getUserRole();
    
    if (!hasAccess || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("admin_booking_extras_v1")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("organization_id", orgId)
      .single();

    if (error) {
      console.error("Error fetching booking extras:", error);
      return NextResponse.json(
        { error: "Failed to fetch booking extras" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error in extras route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
