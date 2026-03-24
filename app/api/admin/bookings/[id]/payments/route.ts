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
      .from("admin_booking_payments_list")
      .select("*")
      .eq("booking_id", bookingId);

    // 🔥 APLICĂ FILTRUL CORECT
    query = applyOrganizationFilter(query, orgContext);
    query = query.order("attempt_no", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching booking payments:", error);
      return NextResponse.json(
        { error: "Failed to fetch booking payments" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Unexpected error in payments route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
