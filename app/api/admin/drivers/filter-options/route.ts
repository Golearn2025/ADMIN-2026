import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { hasAccess } = await getUserRole();

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch filter options from admin_driver_vehicle_filter_v1
    const { data, error } = await supabase
      .from("admin_driver_vehicle_filter_v1")
      .select("category, make, color, year");

    if (error) {
      console.error("Error fetching filter options:", error);
      return NextResponse.json(
        { error: "Failed to fetch filter options" },
        { status: 500 }
      );
    }

    // Deduplicate and sort
    const categories = [...new Set(data?.map(d => d.category).filter(Boolean))] as string[];
    const makes = [...new Set(data?.map(d => d.make).filter(Boolean))] as string[];
    const colors = [...new Set(data?.map(d => d.color).filter(Boolean))] as string[];
    const years = [...new Set(data?.map(d => d.year).filter(Boolean))] as number[];

    return NextResponse.json({
      categories: categories.sort(),
      makes: makes.sort(),
      colors: colors.sort(),
      years: years.sort((a, b) => b - a), // Descending order (newest first)
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
