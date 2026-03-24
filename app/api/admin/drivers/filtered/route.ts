import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext, applyOrganizationFilter } from "@/lib/multi-tenant";

export async function POST(request: NextRequest) {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, make, color, year } = body;

    // 🔥 FOLOSIM CONTEXTUL CORECT
    const orgContext = await getOrganizationContext(request);

    console.log("🔍 ADVANCED FILTERS API CALLED");
    console.log("   orgContext:", orgContext);
    console.log("   category:", category);
    console.log("   make:", make);
    console.log("   color:", color);
    console.log("   year:", year);

    const supabase = await createClient();

    // 🔥 FOLOSIM VIEW CA SINGURĂ SURSĂ DE ADEVĂR
    let query = supabase
      .from("admin_drivers_list_v4")
      .select("*");

    // Apply organization filter
    query = applyOrganizationFilter(query, orgContext);

    // Apply filters
    if (category && category.length > 0) {
      query = query.in("category", category);
    }
    if (make && make.length > 0) {
      query = query.in("make", make);
    }
    if (color && color.length > 0) {
      query = query.in("color", color);
    }
    if (year && year.length > 0) {
      query = query.in("year", year);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    // Add computed fields for UI compatibility
    const enrichedDrivers = (data || []).map(driver => ({
      ...driver,
      full_name: `${driver.first_name} ${driver.last_name}`
    }));

    if (error) {
      console.error("❌ Query error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ QUERY SUCCESS - drivers returned:", enrichedDrivers?.length || 0);

    return NextResponse.json({ drivers: enrichedDrivers });
  } catch (error) {
    console.error("❌ API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
