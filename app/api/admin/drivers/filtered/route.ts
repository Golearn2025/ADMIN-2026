import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orgId, hasAccess } = await getUserRole();

    if (!hasAccess || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, make, color, year } = body;

    console.log("🔍 ADVANCED FILTERS API CALLED");
    console.log("   org_id:", orgId);
    console.log("   category:", category);
    console.log("   make:", make);
    console.log("   color:", color);
    console.log("   year:", year);

    const supabase = await createClient();

    // Call RPC with filters
    const { data, error: rpcError } = await supabase.rpc("admin_get_drivers_filtered", {
      org_id: orgId,
      f_category: category,
      f_make: make,
      f_color: color,
      f_year: year,
    });

    if (rpcError) {
      console.error("❌ RPC error:", rpcError);
      return NextResponse.json(
        { error: rpcError.message },
        { status: 500 }
      );
    }

    console.log("✅ RPC SUCCESS - drivers returned:", data?.length || 0);

    return NextResponse.json({ drivers: data || [] });
  } catch (error) {
    console.error("❌ API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
