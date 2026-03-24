import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext, applyOrganizationFilter } from "@/lib/multi-tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 🔥 FOLOSIM CONTEXTUL CORECT
    const orgContext = await getOrganizationContext(request);

    let query = supabase
      .from("admin_booking_extras")
      .select("*")
      .eq("booking_id", bookingId);

    // 🔥 APLICĂ FILTRUL CORECT
    query = applyOrganizationFilter(query, orgContext);

    const { data, error } = await query.single();

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
