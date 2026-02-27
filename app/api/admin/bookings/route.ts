import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { orgId } = await getUserRole();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - no organization" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from("admin_booking_list")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Add search filter
    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    // Add pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
