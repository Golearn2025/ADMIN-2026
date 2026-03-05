import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    // Cap pageSize at 100 to prevent DoS attacks
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * pageSize;

    // Build query - select only needed fields for performance
    let query = supabase
      .from("admin_booking_list")
      .select(
        `
        id,
        reference,
        status,
        trip_status,
        booking_type,
        scheduled_at,
        created_at,
        customer_first_name,
        customer_last_name,
        customer_phone,
        customer_email,
        pickup_address,
        dropoff_address,
        distance_miles,
        duration_min,
        requested_vehicle_category_label,
        requested_vehicle_display,
        driver_name,
        driver_phone,
        vehicle_plate,
        vehicle_make_model,
        vehicle_status,
        display_price_pence,
        latest_payment_currency,
        latest_payment_status,
        latest_payment_created_at,
        pricing_source,
        has_financial_snapshot,
        financial_status,
        booked_hours,
        booked_days,
        return_scheduled_at,
        fleet_size
      `,
        { count: "exact" }
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    // Add search filter
    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%,customer_phone.ilike.%${search}%,requested_vehicle_category_label.ilike.%${search}%,requested_vehicle_model_label.ilike.%${search}%,pickup_address.ilike.%${search}%,dropoff_address.ilike.%${search}%,driver_name.ilike.%${search}%,vehicle_plate.ilike.%${search}%`
      );
    }

    // Add pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", JSON.stringify(error, null, 2));
      console.error("Search term:", search);
      return NextResponse.json(
        { error: "Failed to fetch bookings", details: error.message, code: error.code },
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
