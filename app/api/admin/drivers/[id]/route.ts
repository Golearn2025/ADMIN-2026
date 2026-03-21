import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔥 API DRIVER DETAILS - V4 MODULAR");
  
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    console.log("Fetching driver:", id);

    // Parallel queries - USE admin_drivers_list_v4 as SINGLE SOURCE OF TRUTH
    const [
      profileResult,
      vehiclesResult,
      driverDocsResult,
      vehicleDocsResult
    ] = await Promise.all([
      supabase.from("admin_drivers_list_v4").select("*").eq("id", id).single(),
      supabase.from("admin_driver_vehicles_v4").select("*").eq("driver_id", id),
      supabase.from("admin_driver_documents_with_reviewer_v4_fix").select("*").eq("driver_id", id).eq("entity_type", "driver"),
      supabase.from("admin_driver_documents_with_reviewer_v4_fix").select("*").eq("driver_id", id).eq("entity_type", "vehicle")
    ]);

    if (profileResult.error) {
      console.error("Driver not found:", profileResult.error);
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    console.log("✅ Driver loaded from V4 modular views");
    console.log("   vehicles:", vehiclesResult.data?.length || 0);
    console.log("   driver_documents:", driverDocsResult.data?.length || 0);
    console.log("   vehicle_documents:", vehicleDocsResult.data?.length || 0);

    // Return modular structure - profile from admin_drivers_list_v4 (has all fields)
    return NextResponse.json({
      ...profileResult.data,
      full_name: `${profileResult.data.first_name} ${profileResult.data.last_name}`,
      documents_completed: profileResult.data.total_approved_docs || 0,
      documents_expired: (profileResult.data.expired_driver_docs || 0) + (profileResult.data.expired_vehicle_docs || 0),
      documents_required: profileResult.data.total_required_docs || 0,
      member_since: profileResult.data.created_at,
      vehicles: vehiclesResult.data || [],
      driver_documents: driverDocsResult.data || [],
      vehicle_documents: vehicleDocsResult.data || []
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
