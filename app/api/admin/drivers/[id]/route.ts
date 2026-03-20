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

    // Parallel queries - USE admin_driver_overview_v2 as SINGLE SOURCE OF TRUTH
    const [
      profileResult,
      vehiclesResult,
      driverDocsResult,
      vehicleDocsResult
    ] = await Promise.all([
      supabase.from("admin_driver_overview_v2").select("*").eq("id", id).single(),
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

    // Return modular structure - profile from admin_driver_overview_v2 (has all fields)
    return NextResponse.json({
      ...profileResult.data,
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
