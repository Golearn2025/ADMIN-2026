import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔥 API DRIVER DETAILS - admin_driver_full_v3");
  
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    console.log("Fetching driver:", id);

    // Single query to admin_driver_full_v3 view
    const { data, error } = await supabase
      .from("admin_driver_full_v3")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Driver not found:", error);
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    console.log("✅ Driver loaded from admin_driver_full_v3");
    console.log("   vehicles:", data.vehicles?.length || 0);
    console.log("   driver_documents:", data.driver_documents?.length || 0);
    console.log("   vehicle_documents:", data.vehicle_documents?.length || 0);

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
