import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { orgId } = await getUserRole();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - no organization" },
        { status: 401 }
      );
    }

    const { id: bookingId } = await params;

    console.log('🔍 [FLEET-SLOTS] Fetching from admin_booking_legs_list (fleet uses legs)');

    // Fleet bookings use LEGS, not a separate slots table
    // Query legs and transform to slot format for UI
    const { data: legs, error } = await supabase
      .from("admin_booking_legs_list")
      .select("*")
      .eq("booking_id", bookingId)
      .order("leg_number", { ascending: true });

    if (error) {
      console.error("❌ [FLEET-SLOTS] Supabase error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch fleet slots", details: error.message },
        { status: 500 }
      );
    }

    // Transform legs to slot format for FleetSlotsTable component
    const slots = (legs || []).map((leg: any) => ({
      slot_number: leg.leg_number,
      slot_status: leg.leg_status || 'PENDING',
      requested_vehicle_category_label: leg.vehicle_category_id || 'N/A',
      requested_vehicle_model_label: leg.vehicle_model_id || 'N/A',
      assigned_driver_id: leg.assigned_driver_id,
      driver_name: leg.driver_name,
      driver_phone: leg.driver_phone,
      assigned_vehicle_id: leg.assigned_vehicle_id,
      vehicle_plate: leg.vehicle_plate,
      vehicle_make_model: leg.vehicle_make_model,
    }));

    console.log('✅ [FLEET-SLOTS] Transformed legs → slots:', {
      legsFound: legs?.length || 0,
      slotsReturned: slots.length
    });

    return NextResponse.json({
      data: slots,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
