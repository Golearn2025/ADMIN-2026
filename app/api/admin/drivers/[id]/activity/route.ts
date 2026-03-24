import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext, applyOrganizationFilter } from "@/lib/multi-tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 🔥 FOLOSIM CONTEXTUL CORECT
    const orgContext = await getOrganizationContext(request);
    
    // 🔥 APLICĂ FILTRUL CORECT
    let query = supabase
      .from("admin_driver_activity_v1")
      .select("*")
      .eq("driver_id", id);

    query = applyOrganizationFilter(query, orgContext);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching activity logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
